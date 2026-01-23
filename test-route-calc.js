// Test route calculation with user's coordinates
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

// User's test coordinates
const startLat = 34.62649;
const startLon = -84.19385;
const endLat = 34.66603;
const endLon = -84.13631;

console.log('Testing route calculation with coordinates:');
console.log('Start:', startLat, startLon);
console.log('End:', endLat, endLon);

// Load and parse GPX
const gpxPath = '/home/user/workspace/webapp/public/data/appalachian_trail.gpx';
console.log('\nLoading GPX from:', gpxPath);

if (!fs.existsSync(gpxPath)) {
  console.error('GPX file not found at:', gpxPath);
  process.exit(1);
}

const gpxText = fs.readFileSync(gpxPath, 'utf-8');
console.log('GPX file size:', gpxText.length, 'bytes');

const parser = new DOMParser();
const gpx = parser.parseFromString(gpxText, 'text/xml');
const trackPoints = gpx.getElementsByTagName('trkpt');
console.log('Found', trackPoints.length, 'track points');

const trailPath = [];
for (let i = 0; i < trackPoints.length; i++) {
  const lat = parseFloat(trackPoints[i].getAttribute('lat') || '0');
  const lon = parseFloat(trackPoints[i].getAttribute('lon') || '0');
  if (lat && lon) {
    trailPath.push([lat, lon]);
  }
}

console.log('Parsed', trailPath.length, 'valid points');

if (trailPath.length === 0) {
  console.error('No valid trail points found');
  process.exit(1);
}

// Find closest points on trail
let startIdx = 0;
let endIdx = trailPath.length - 1;
let minStartDist = Infinity;
let minEndDist = Infinity;

trailPath.forEach((point, idx) => {
  const distToStart = Math.sqrt(
    Math.pow(point[0] - startLat, 2) + Math.pow(point[1] - startLon, 2)
  );
  const distToEnd = Math.sqrt(
    Math.pow(point[0] - endLat, 2) + Math.pow(point[1] - endLon, 2)
  );

  if (distToStart < minStartDist) {
    minStartDist = distToStart;
    startIdx = idx;
  }
  if (distToEnd < minEndDist) {
    minEndDist = distToEnd;
    endIdx = idx;
  }
});

console.log('\nClosest trail points:');
console.log('Start index:', startIdx, 'at', trailPath[startIdx], 'distance:', minStartDist);
console.log('End index:', endIdx, 'at', trailPath[endIdx], 'distance:', minEndDist);

if (startIdx <= endIdx) {
  const segment = trailPath.slice(startIdx, endIdx + 1);
  console.log('\nRoute segment has', segment.length, 'points');
  console.log('First 5 points:', segment.slice(0, 5));
  console.log('Last 5 points:', segment.slice(-5));

  // Calculate bounds
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  segment.forEach(([lat, lon]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  });

  console.log('\nSegment bounds:');
  console.log('Lat:', minLat, 'to', maxLat);
  console.log('Lon:', minLon, 'to', maxLon);

  const midIdx = Math.floor(segment.length / 2);
  console.log('\nMap center (midpoint):', segment[midIdx]);

} else {
  console.log('\nERROR: startIdx > endIdx, cannot create segment');
}
