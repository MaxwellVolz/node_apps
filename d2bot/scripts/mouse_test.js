import robot from "robotjs";

const { width, height } = robot.getScreenSize();
const cx = Math.floor(width/2), cy = Math.floor(height/2);
console.log("Moving mouse to center:", cx, cy);
robot.moveMouse(cx, cy);
robot.mouseClick("left");
console.log("Done.");
