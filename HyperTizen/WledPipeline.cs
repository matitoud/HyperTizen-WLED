using System;
using System.Diagnostics;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace HyperTizen
{
    // Capture and DDP run independently. Only small RGB arrays cross the lock.
    internal sealed class WledPipeline
    {
        // Volatile reference to the latest one-second window. The UI reads it
        // without writing a preference to flash every second.
        private static string _latestMetrics;
        internal static string LatestMetrics => Volatile.Read(ref _latestMetrics);
        private readonly object _sync = new object();
        private readonly SemaphoreSlim _newTarget = new SemaphoreSlim(0, 1);
        private readonly byte[] _from, _target, _frame;
        private readonly IPAddress _ip;
        private readonly int _count, _top, _right, _bottom, _left, _start, _transitionMs;
        private readonly bool _reverse, _smooth, _fastCapture;
        private long _transitionStart;
        private bool _ready;
        private long _captures, _batches, _targets;
        private double _captureMs, _batchMs, _processingMs;
        private double _minBatchMs = double.MaxValue, _maxBatchMs;
        private long _totalCaptures, _totalBatches, _totalTargets;
        private double _totalBatchMs;

        public WledPipeline(IPAddress ip, int count, int top, int right, int bottom,
            int left, int start, bool reverse, bool smooth, int transitionMs, bool fastCapture)
        {
            _ip = ip; _count = count; _top = top; _right = right; _bottom = bottom;
            _left = left; _start = start; _reverse = reverse;
            _smooth = smooth; _transitionMs = transitionMs; _fastCapture = fastCapture;
            _from = new byte[count * 3];
            _target = new byte[count * 3];
            _frame = new byte[count * 3];
        }

        public async Task RunAsync(CancellationToken ct)
        {
            Volatile.Write(ref _latestMetrics, null);
            using (var output = new DdpOutput(_ip, _count))
            {
                Task captureTask = Task.Run(() => CaptureLoop(ct), ct);
                long sends = 0;
                double udpMs = 0;
                double renderMs = 0;
                long reportStart = Stopwatch.GetTimestamp();
                long telemetryStart = reportStart;
                long totalSends = 0, previousSends = 0;
                long previousCaptures = 0, previousBatches = 0, previousTargets = 0;
                double previousBatchMs = 0;
                try
                {
                    await _newTarget.WaitAsync(ct);
                    while (!ct.IsCancellationRequested)
                    {
                        if (captureTask.IsFaulted) await captureTask;
                        long frameStart = Stopwatch.GetTimestamp();
                        lock (_sync) Render(frameStart, _frame);
                        renderMs += ElapsedMs(frameStart);
                        long udpStart = Stopwatch.GetTimestamp();
                        await output.SendFrameAsync(_frame);
                        udpMs += ElapsedMs(udpStart);
                        sends++;
                        totalSends++;

                        double telemetryMs = ElapsedMs(telemetryStart);
                        if (telemetryMs >= 1000)
                        {
                            lock (_sync)
                            {
                                long captures = _totalCaptures - previousCaptures;
                                long batches = _totalBatches - previousBatches;
                                long targets = _totalTargets - previousTargets;
                                Volatile.Write(ref _latestMetrics, JsonConvert.SerializeObject(new {
                                    captureFps = captures * 1000.0 / telemetryMs,
                                    ddpFps = (totalSends - previousSends) * 1000.0 / telemetryMs,
                                    targetFps = targets * 1000.0 / telemetryMs,
                                    batchMs = batches == 0 ? 0 : (_totalBatchMs - previousBatchMs) / batches,
                                    batchesPerFrame = captures == 0 ? 0 : (double)batches / captures,
                                    fastCapture = _fastCapture
                                }));
                                previousCaptures = _totalCaptures;
                                previousBatches = _totalBatches;
                                previousTargets = _totalTargets;
                                previousBatchMs = _totalBatchMs;
                            }
                            previousSends = totalSends;
                            telemetryStart = Stopwatch.GetTimestamp();
                        }

                        double windowMs = ElapsedMs(reportStart);
                        if (windowMs >= 10000)
                        {
                            lock (_sync)
                            {
                                Tizen.Log.Debug("HyperTizen", string.Format(
                                    "WLED perf: capture={0:F1}fps ({1} frames), batch min/avg/max={2:F1}/{3:F1}/{4:F1}ms ({5:F1} per capture), captureTotal={6:F1}ms, colorMap={7:F2}ms, render={8:F2}ms, DDP={9:F1}fps, UDP={10:F2}ms; smooth={11}/{12}ms, fastCapture={13}, targetUpdates={14:F1}fps",
                                    _captures * 1000.0 / windowMs, _captures,
                                    _batches == 0 ? 0 : _minBatchMs,
                                    _batches == 0 ? 0 : _batchMs / _batches,
                                    _maxBatchMs,
                                    _captures == 0 ? 0 : (double)_batches / _captures,
                                    _captures == 0 ? 0 : _captureMs / _captures,
                                    _captures == 0 ? 0 : _processingMs / _captures,
                                    sends == 0 ? 0 : renderMs / sends,
                                    sends * 1000.0 / windowMs, sends == 0 ? 0 : udpMs / sends,
                                    _smooth, _transitionMs, _fastCapture, _targets * 1000.0 / windowMs));
                                _captures = _batches = _targets = 0;
                                _captureMs = _batchMs = _processingMs = 0;
                                _minBatchMs = double.MaxValue; _maxBatchMs = 0;
                            }
                            sends = 0; udpMs = 0; renderMs = 0; reportStart = Stopwatch.GetTimestamp();
                        }

                        if (_smooth)
                        {
                            int remaining = 33 - (int)ElapsedMs(frameStart);
                            if (remaining > 0) await Task.Delay(remaining, ct);
                        }
                        else
                        {
                            await _newTarget.WaitAsync(ct);
                        }
                    }
                }
                finally
                {
                    if (ct.IsCancellationRequested)
                        try { await captureTask; } catch (OperationCanceledException) { }
                }
            }
        }

        private async Task CaptureLoop(CancellationToken ct)
        {
            byte[] mapped = new byte[_count * 3];
            bool firstFrame = true;
            Action<Color[]> onBatch = null;
            if (!_smooth)
                onBatch = colors => { if (!firstFrame) Publish(colors, mapped); };
            while (!ct.IsCancellationRequested)
            {
                // Without smoothing, publish each completed hardware batch after
                // the first complete frame. Other zones retain their last color.
                CaptureResult result = await Capturer.GetColorsWithMetrics(_fastCapture, onBatch);
                if (firstFrame || _smooth) Publish(result.Colors, mapped);
                firstFrame = false;
                lock (_sync)
                {
                    _captures++;
                    _batches += result.Batches;
                    _captureMs += result.TotalMs;
                    _batchMs += result.BatchMs;
                    _totalCaptures++;
                    _totalBatches += result.Batches;
                    _totalBatchMs += result.BatchMs;
                    if (result.Batches > 0)
                    {
                        _minBatchMs = Math.Min(_minBatchMs, result.MinBatchMs);
                        _maxBatchMs = Math.Max(_maxBatchMs, result.MaxBatchMs);
                    }
                }
            }
        }

        private void Publish(Color[] colors, byte[] mapped)
        {
            long mapStart = Stopwatch.GetTimestamp();
            DdpOutput.MapColors(colors, mapped, _count,
                _top, _right, _bottom, _left, _start, _reverse);
            double mapMs = ElapsedMs(mapStart);
            long now = Stopwatch.GetTimestamp();
            lock (_sync)
            {
                if (_ready && _smooth)
                    Render(now, _from);
                else
                    Buffer.BlockCopy(mapped, 0, _from, 0, mapped.Length);
                Buffer.BlockCopy(mapped, 0, _target, 0, mapped.Length);
                _transitionStart = now;
                _ready = true;
                _targets++;
                _totalTargets++;
                _processingMs += mapMs;
            }
            if (_newTarget.CurrentCount == 0) _newTarget.Release();
        }

        private void Render(long now, byte[] destination)
        {
            double fraction = _smooth
                ? Math.Min(1.0, (now - _transitionStart) * 1000.0 / Stopwatch.Frequency / _transitionMs)
                : 1.0;
            for (int i = 0; i < destination.Length; i++)
                destination[i] = (byte)Math.Round(_from[i] + (_target[i] - _from[i]) * fraction);
        }

        private static double ElapsedMs(long start) =>
            (Stopwatch.GetTimestamp() - start) * 1000.0 / Stopwatch.Frequency;
    }
}
