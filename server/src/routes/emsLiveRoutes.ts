import { Router } from 'express';

const router = Router();

// SSE endpoint: GET /api/ems/live/:stationId
router.get('/live/:stationId', (req, res) => {
  const { stationId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send heartbeat comment every 25s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  // Send EMS data every 3 seconds
  const interval = setInterval(async () => {
    try {
      // Fetch latest station data
      const stationRes = await fetch(`${req.protocol}://${req.get('host')}/api/stations/${stationId}`);
      const stationJson = await stationRes.json();
      const station = stationJson.success ? stationJson.data : null;

      // Fetch latest alert stats
      const alertRes = await fetch(`${req.protocol}://${req.get('host')}/api/alerts/stats`);
      const alertJson = await alertRes.json();
      const alertStats = alertJson.success ? alertJson.data : {};

      // Fetch equipment states for this station
      const equipRes = await fetch(`${req.protocol}://${req.get('host')}/api/equipments`);
      const equipJson = await equipRes.json();
      const allEquipments = equipJson.success ? equipJson.data.filter((e: any) => e.stationId === stationId) : [];

      // Generate realistic EMS data
      const now = Date.now();
      const hour = new Date().getHours();
      const solarFactor = Math.max(0, Math.sin((hour - 6) * Math.PI / 12)); // 6am-6pm curve
      const cloudFactor = 0.7 + Math.random() * 0.3; // 70-100% variability

      const pvPower = Math.max(0, (station?.peakPower || 1000) * solarFactor * cloudFactor / 1000); // kW
      const pvToday = (station?.installedCapacity || 1000) * solarFactor * 0.8; // kWh
      const batSoc = Math.min(100, Math.max(10, 60 + (Math.random() - 0.5) * 20));
      const batPower = batSoc > 80 ? -Math.random() * 50 : batSoc < 30 ? Math.random() * 80 : (Math.random() - 0.5) * 40;
      const gridPower = pvPower * 0.3 + batPower * 0.5 + (Math.random() - 0.3) * 20;
      const loadPower = (station?.capacity || 500) * (0.3 + Math.random() * 0.2);

      const emsData = {
        stationId,
        timestamp: now,
        pv: {
          power: Math.round(pvPower * 10) / 10,
          today: Math.round(pvToday * 10) / 10,
          status: solarFactor > 0.05 ? 'generating' : 'standby',
          alertCount: alertStats.total || 0,
        },
        battery: {
          soc: Math.round(batSoc),
          power: Math.round(batPower * 10) / 10,
          status: batPower < 0 ? 'charging' : batPower > 0 ? 'discharging' : 'idle',
          temp: Math.round(25 + Math.random() * 10),
          alertCount: alertStats.critical || 0,
        },
        grid: {
          power: Math.round(gridPower * 10) / 10,
          today: Math.round(Math.abs(gridPower) * solarFactor * 0.5 * 10) / 10,
          status: gridPower > 5 ? 'importing' : gridPower < -5 ? 'exporting' : 'balanced',
        },
        load: {
          power: Math.round(loadPower * 10) / 10,
          today: Math.round(loadPower * solarFactor * 0.6 * 10) / 10,
          status: loadPower > 100 ? 'high' : loadPower > 30 ? 'normal' : 'low',
        },
        equipment: allEquipments.slice(0, 8).map((e: any) => ({
          id: e._id,
          name: e.name,
          type: e.type,
          status: e.status || 'online',
          power: Math.round(Math.random() * 100 * 10) / 10,
          temp: Math.round(30 + Math.random() * 20),
        })),
        alerts: {
          total: alertStats.total || 0,
          critical: alertStats.critical || 0,
          warning: alertStats.warning || 0,
          unacknowledged: alertStats.unacknowledged || 0,
        },
      };

      res.write(`data: ${JSON.stringify(emsData)}\n\n`);
    } catch (err) {
      // On error, send still-alive marker
      res.write(`data: ${JSON.stringify({ stationId, timestamp: Date.now(), error: true })}\n\n`);
    }
  }, 3000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
    res.end();
  });
});

export default router;
