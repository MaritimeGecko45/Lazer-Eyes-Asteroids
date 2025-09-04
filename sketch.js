/*
 * 👾 Eye-Laser + Asteroid Dodge (Mirrored) with Scoring
 * Score increases for every asteroid destroyed.
 * Bigger asteroids give more points.
 * High score displayed above current score.
 */

let video;
let bodyPose;
let poses = [];

// asteroid settings
let asteroids = [];
const ASTEROID_SPAWN_RATE = 0.02;
const ASTEROID_SPEED_MIN = 1;
const ASTEROID_SPEED_MAX = 3;
const ASTEROID_SIZE_MIN = 10;
const ASTEROID_SIZE_MAX = 200;

// scoring
let score = 0;
let highScore = 0;

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  bodyPose.detectStart(video, gotPoses);
}

function draw() {
  background(30);

  // spawn asteroids randomly
  if (random() < ASTEROID_SPAWN_RATE) spawnAsteroid();

  // update and draw asteroids
  for (let a of asteroids) {
    a.x += a.vx;
    a.y += a.vy;
    fill(150);
    noStroke();
    ellipse(a.x, a.y, a.r * 2);
  }

  // draw mirrored heads and lasers
  drawHeadsAndLasers();

  // check collisions
  const hit = handleAsteroidCollisions();
  if (hit) {
    if (score > highScore) highScore = score;
    score = 0;
  }

 // display high score above current score
noStroke();
fill(255);
textSize(16); // lowered text size
textAlign(RIGHT, TOP);
text(`High Score: ${Math.floor(highScore)}`, width - 20, 20);

// display current score
textSize(32);
text(`${Math.floor(score)}`, width - 20, 40);


  // cleanup off-screen asteroids
  asteroids = asteroids.filter(a => a.x > -100 && a.x < width + 100 && a.y > -100 && a.y < height + 100);
}

// ----- HEADS AND LASERS -----
function drawHeadsAndLasers() {
  for (let p = 0; p < poses.length; p++) {
    const mirrored = mirrorPose(poses[p]);
    const leftEye  = mirrored.keypoints.find(k => k.name === "left_eye");
    const rightEye = mirrored.keypoints.find(k => k.name === "right_eye");

    if (leftEye && rightEye && leftEye.confidence > 0.5 && rightEye.confidence > 0.5) {
      const headX = (leftEye.x + rightEye.x) / 2;
      const headY = (leftEye.y + rightEye.y) / 2;
      const headSize = dist(leftEye.x, leftEye.y, rightEye.x, rightEye.y) * 2;

      // draw head
      fill(255, 255, 0, 180);
      stroke(0);
      strokeWeight(2);
      ellipse(headX, headY, headSize, headSize);

      // calculate direction
      const dir = getHeadDirection(mirrored);
      if (dir) {
        fireLaser(leftEye.x, leftEye.y, dir.x, dir.y);
        fireLaser(rightEye.x, rightEye.y, dir.x, dir.y);
      }
    }
  }
}

// ----- MIRROR POSE -----
function mirrorPose(pose) {
  const cloned = { ...pose, keypoints: [] };
  for (let kp of pose.keypoints) {
    cloned.keypoints.push({
      ...kp,
      x: width - kp.x,
      y: kp.y
    });
  }
  return cloned;
}

// ----- HEAD DIRECTION -----
function getHeadDirection(pose) {
  const nose = pose.keypoints.find(k => k.name === "nose");
  const leftEar = pose.keypoints.find(k => k.name === "left_ear");
  const rightEar = pose.keypoints.find(k => k.name === "right_ear");

  if (nose && nose.confidence > 0.5 && leftEar && rightEar &&
      leftEar.confidence > 0.5 && rightEar.confidence > 0.5) {
    const midEarX = (leftEar.x + rightEar.x) / 2;
    const midEarY = (leftEar.y + rightEar.y) / 2;
    const dx = nose.x - midEarX;
    const dy = nose.y - midEarY;
    const mag = sqrt(dx * dx + dy * dy);
    if (mag > 0) return { x: dx / mag, y: dy / mag };
  }

  // fallback shoulders
  const leftShoulder = pose.keypoints.find(k => k.name === "left_shoulder");
  const rightShoulder = pose.keypoints.find(k => k.name === "right_shoulder");
  if (nose && leftShoulder && rightShoulder &&
      nose.confidence > 0.5 && leftShoulder.confidence > 0.5 && rightShoulder.confidence > 0.5) {
    const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const dx = nose.x - midShoulderX;
    const dy = nose.y - midShoulderY;
    const mag = sqrt(dx * dx + dy * dy);
    if (mag > 0) return { x: dx / mag, y: dy / mag };
  }

  return null;
}

// ----- FIRE LASER -----
function fireLaser(startX, startY, dirX, dirY) {
  const endX = startX + dirX * 1000;
  const endY = startY + dirY * 1000;

  stroke(255, 0, 0);
  strokeWeight(6);
  line(startX, startY, endX, endY);

  stroke(255, 80, 80, 150);
  strokeWeight(12);
  line(startX, startY, endX, endY);

  for (let a of asteroids) {
    if (pointLineDist(a.x, a.y, startX, startY, endX, endY) < a.r) {
      a.dead = true;
      score += a.r; // bigger asteroids give more points
    }
  }
  asteroids = asteroids.filter(a => !a.dead);
}

// ----- ASTEROID COLLISIONS -----
function handleAsteroidCollisions() {
  if (poses.length === 0) return false;
  const mirrored = mirrorPose(poses[0]);
  const leftEye = mirrored.keypoints.find(k => k.name === "left_eye");
  const rightEye = mirrored.keypoints.find(k => k.name === "right_eye");
  if (!leftEye || !rightEye) return false;

  const headX = (leftEye.x + rightEye.x) / 2;
  const headY = (leftEye.y + rightEye.y) / 2;
  const headR = dist(leftEye.x, leftEye.y, rightEye.x, rightEye.y);

  let hit = false;
  for (let a of asteroids) {
    if (dist(a.x, a.y, headX, headY) < a.r + headR) {
      fill(255, 0, 0, 120);
      rect(0, 0, width, height);
      hit = true;
    }
  }
  return hit;
}

// ----- SPAWN ASTEROIDS -----
function spawnAsteroid() {
  const edge = floor(random(4));
  let x, y;
  if (edge === 0) { x = random(width); y = -20; }
  else if (edge === 1) { x = width + 20; y = random(height); }
  else if (edge === 2) { x = random(width); y = height + 20; }
  else { x = -20; y = random(height); }

  const angle = atan2(height / 2 - y, width / 2 - x);
  const speed = random(ASTEROID_SPEED_MIN, ASTEROID_SPEED_MAX);
  const vx = cos(angle) * speed;
  const vy = sin(angle) * speed;

  const r = random(ASTEROID_SIZE_MIN, ASTEROID_SIZE_MAX) / 2;
  asteroids.push({ x, y, vx, vy, r });
}

// ----- UTILITY -----
function pointLineDist(px, py, x1, y1, x2, y2) {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? dot / lenSq : -1;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  const dx = px - xx, dy = py - yy;
  return sqrt(dx * dx + dy * dy);
}

function gotPoses(results) { poses = results; }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(width, height);
}
