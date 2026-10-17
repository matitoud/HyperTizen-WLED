using System;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

namespace HyperTizen
{
    internal sealed class DdpOutput : IDisposable
    {
        private static readonly int[] Zones = { 0, 1, 2, 3, 4, 5, 7, 6 };
        private readonly UdpClient _udp = new UdpClient();
        private readonly byte[] _packet;
        private readonly IPEndPoint _endpoint;
        private byte _sequence;

        public DdpOutput(IPAddress address, int ledCount)
        {
            _endpoint = new IPEndPoint(address, 4048);
            _packet = new byte[10 + ledCount * 3];
            _packet[0] = 0x41;
            _packet[2] = 0x00;
            _packet[3] = 0x01;
            int length = ledCount * 3;
            _packet[8] = (byte)(length >> 8);
            _packet[9] = (byte)length;
        }

        public async Task SendFrameAsync(byte[] rgb)
        {
            _packet[1] = _sequence++;
            Buffer.BlockCopy(rgb, 0, _packet, 10, rgb.Length);
            await _udp.SendAsync(_packet, _packet.Length, _endpoint);
        }

        public static void MapColors(Color[] samples, byte[] rgb, int ledCount,
            int top, int right, int bottom, int left, int start, bool reverse)
        {
            // Physical order: top-left clockwise. Existing samples split each side.
            int logical = 0;
            for (int side = 0; side < 4; side++)
            {
                int sideCount = side == 0 ? top : side == 1 ? right : side == 2 ? bottom : left;
                int first = sideCount / 2;
                for (int local = 0; local < sideCount; local++, logical++)
                {
                    int zone = Zones[side * 2 + (local < first ? 0 : 1)];
                    int led = reverse ? (start - logical + ledCount) % ledCount
                                      : (start + logical) % ledCount;
                    int offset = led * 3;
                    rgb[offset] = Scale(samples[zone].R);
                    rgb[offset + 1] = Scale(samples[zone].G);
                    rgb[offset + 2] = Scale(samples[zone].B);
                }
            }
        }

        private static byte Scale(int value) => (byte)(Math.Clamp(value, 0, 1023) * 255 / 1023);
        public void Dispose() => _udp.Dispose();
    }
}
