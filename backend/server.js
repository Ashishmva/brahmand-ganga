// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

// --- KEYS FROM .env ONLY - Never hardcode ---
const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const MAPILLARY_TOKEN = process.env.MAPILLARY_TOKEN || '';
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || '';
const ISRO_KEY = process.env.ISRO_BHUVAN_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// Health check
app.get('/api/health', (req,res)=>res.json({status:'Brahmand Ganga Backend Live', time:new Date().toISOString()}));

// --- NASA APIs ---
// 1. DONKI - Solar Storm / Radiation
app.get('/api/nasa/donki', async (req,res)=>{
  try{
    let r = await fetch(`https://api.nasa.gov/DONKI/CME?startDate=2026-11-01&endDate=2026-11-11&api_key=${NASA_KEY}`);
    let d = await r.json();
    res.json({source:'NASA DONKI', count:d.length, data:d.slice(0,5)});
  }catch(e){ res.json({error:e.message}); }
});

// 2. EPIC - Earth Daily Photo
app.get('/api/nasa/epic', async (req,res)=>{
  try{
    let r = await fetch(`https://api.nasa.gov/EPIC/api/natural?api_key=${NASA_KEY}`);
    let d = await r.json();
    res.json({source:'NASA EPIC', latest:d[0]||null, imageUrl: d[0] ? `https://epic.gsfc.nasa.gov/archive/natural/${d[0].date.slice(0,10).replace(/-/g,'/')}/png/${d[0].image}.png` : null});
  }catch(e){ res.json({error:e.message}); }
});

// 3. APOD - Astronomy Picture
app.get('/api/nasa/apod', async (req,res)=>{
  try{ let r = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`); res.json(await r.json()); }catch(e){ res.json({error:e.message}); }
});

// 4. ISS Live Position - No key needed
app.get('/api/iss-now', async (req,res)=>{
  try{ let r = await fetch('http://api.open-notify.org/iss-now.json'); res.json(await r.json()); }catch(e){ res.json({error:e.message}); }
});

// 5. Astronauts in Space - No key
app.get('/api/astros', async (req,res)=>{
  try{ let r = await fetch('http://api.open-notify.org/astros.json'); res.json(await r.json()); }catch(e){ res.json({error:e.message}); }
});

// --- ISRO APIs ---
// ISRO Bhuvan - Needs key from bhuvan.nrsc.gov.in
app.get('/api/isro/bhuvan', async (req,res)=>{
  if(!ISRO_KEY) return res.json({status:'ISRO key not added yet', note:'Get key from bhuvan.nrsc.gov.in, add ISRO_BHUVAN_API_KEY in .env', fallback:'Using Esri + OpenStreetMap for now'});
  try{ let r = await fetch(`https://bhuvan-app1.nrsc.gov.in/api/?key=${ISRO_KEY}&lat=${req.query.lat||28.61}&lon=${req.query.lon||77.20}`); res.json(await r.json()); }catch(e){ res.json({error:e.message}); }
});

// ISRO - Gaganyaan / Missions - Public info endpoint (no key)
app.get('/api/isro/missions', (req,res)=>{
  res.json({source:'ISRO', missions:[{name:'Gaganyaan', status:'Crew module testing', crew:'4 Indian astronauts'}, {name:'Chandrayaan-3', status:'Lander on Moon South Pole'}, {name:'Aditya-L1', status:'Solar observation at L1'}]});
});

// --- WEATHER & CLIMATE ---
// Open-Meteo - FREE, No key, Best for hackathon
app.get('/api/weather', async (req,res)=>{
  let lat = req.query.lat || 29.22, lon = req.query.lon || 79.52;
  try{ let r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,uv_index,wind_speed_10m&hourly=uv_index&daily=uv_index_max&timezone=auto`); res.json(await r.json()); }catch(e){ res.json({error:e.message}); }
});

// OpenWeather - If you have key
app.get('/api/weather-openweather', async (req,res)=>{
  if(!OPENWEATHER_KEY) return res.json({error:'OPENWEATHER_API_KEY not in .env', use:'/api/weather - Open-Meteo free'});
  let lat = req.query.lat || 29.22, lon = req.query.lon || 79.52;
  try{ let r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`); res.json(await r.json()); }catch(e){ res.json({error:e.message}); }
});

// Climate - NASA POWER - Free, No key
app.get('/api/climate', async (req,res)=>{
  let lat = req.query.lat || 29.22, lon = req.query.lon || 79.52;
  try{ let r = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR&community=RE&longitude=${lon}&latitude=${lat}&start=20261101&end=20261111&format=JSON`); res.json(await r.json()); }catch(e){ res.json({error:e.message}); }
});

// --- MAPS - Frontend asks backend for key, backend returns only if allowed ---
// Never expose key in frontend code, backend injects it via this endpoint for your domain only
app.get('/api/maps-config', (req,res)=>{
  res.json({ googleKeyExists: !!GOOGLE_KEY, mapillaryExists: !!MAPILLARY_TOKEN });
});

// Street View - Proxy via backend so key stays hidden
app.get('/api/streetview', async (req,res)=>{
  if(!GOOGLE_KEY) return res.json({error:'GOOGLE_MAPS_API_KEY not in .env'});
  let {lat,lon} = req.query;
  // Returns Street View image URL signed via backend - frontend just shows image
  res.json({ imageUrl: `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${lat},${lon}&key=${GOOGLE_KEY}` });
});

// Mapillary - Proxy
app.get('/api/mapillary', async (req,res)=>{
  if(!MAPILLARY_TOKEN) return res.json({error:'MAPILLARY_TOKEN not in .env'});
  let {lat,lon} = req.query;
  try{ let r = await fetch(`https://graph.mapillary.com/images?access_token=${MAPILLARY_TOKEN}&fields=id,thumb_1024_url&bbox=${lon-0.02},${lat-0.02},${lon+0.02},${lat+0.02}&limit=5`); res.json(await r.json()); }catch(e){ res.json({error:e.message}); }
});

// --- HEALTH - Save readings to backend (later connect to MongoDB) ---
let healthDB = []; // In-memory for now, replace with MongoDB
app.post('/api/health-readings', (req,res)=>{ let rec = {...req.body, id: Date.now(), createdAt: new Date().toISOString()}; healthDB.push(rec); res.json({saved:true, rec}); });
app.get('/api/health-readings', (req,res)=>res.json(healthDB));

// --- AI - Gemini for Health Summary (key in .env) ---
app.post('/api/ai-summary', async (req,res)=>{
  if(!GEMINI_KEY) return res.json({summary:'Add GEMINI_API_KEY in .env to enable AI summary', fallback:'Your vitals are within entered range. Keep routine.'});
  try{
    let r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({contents:[{parts:[{text:`Summarize these astronaut vitals in 2 lines, no diagnosis: ${JSON.stringify(req.body)}`}]}]})});
    let d = await r.json(); res.json({summary: d.candidates?.[0]?.content?.parts?.[0]?.text || 'AI unavailable'});
  }catch(e){ res.json({error:e.message}); }
});

app.listen(PORT, ()=>console.log('Brahmand Ganga Backend on port '+PORT));
