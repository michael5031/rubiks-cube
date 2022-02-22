import * as THREE from "three";
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {coordinateToString, sides, canvasRoundedRect, normalizeScreenPos} from "./utils";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { BoxGeometry } from "three";

type side = "up" | "down" | "left" | "right" | "front" | "back" ;
type sideBackground = "up" | "down" | "left" | "right" | "front" | "back" | "background";

type sideColors = {
    up:string;
    down: string;
    left: string;
    right:string;
    front:string;
    back:string;

    background: string;
};

type sideMaterials = {
    up:THREE.Material;
    down: THREE.Material;
    left: THREE.Material;
    right:THREE.Material;
    front:THREE.Material;
    back:THREE.Material;

    background: THREE.Material;
};

export class RubiksCube{
    cubes: any; //map<string, mesh> "0:1:0"
    cubesGroup: THREE.Group;
    cubesEdgyGroup: THREE.Group;
    cubeType: number; //which type of rubiks cube, 3 would be the default 3x3 one

    sideColors:sideColors;
    sideMaterials:sideMaterials;

    facePixelsSize: number;
    faceInsetPixels: number;
    faceRoundedPixels: number;

    cubeRoundedAmount: number; //0 is nothing 0.1 is a bit lol

    scene: THREE.Scene;
    camera: THREE.Camera;

    dragPlane: THREE.Mesh;
    raycaster: THREE.Raycaster; 
    
    constructor(scene: THREE.Scene, camera: THREE.Camera){
        this.scene = scene;
        this.camera = camera;

        this.cubeType = 3;

        this.sideColors = {
            up:"#ffffff",
            down: "#ffff00",
            left: "#ff6600",
            right: "#dd0000",
            front: "#30bb10",
            back: "#2233cc",
            background: "#020202",
        }

        this.sideMaterials = {
            up: new THREE.MeshBasicMaterial(),
            down: new THREE.MeshBasicMaterial(),
            left: new THREE.MeshBasicMaterial(),
            right: new THREE.MeshBasicMaterial(),
            front: new THREE.MeshBasicMaterial(),
            back: new THREE.MeshBasicMaterial(),
            background: new THREE.MeshBasicMaterial(),
        }

        this.facePixelsSize = 512;
        this.faceInsetPixels = 10;
        this.faceRoundedPixels = 20;

        this.cubeRoundedAmount = 0.1;

        let dragGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
        // let dragGeometry = new THREE.BoxGeometry(1, 10, 1, 10, 10, 10);
        this.dragPlane = new THREE.Mesh(dragGeometry, new THREE.MeshBasicMaterial({color: 0x404040}));

        this.raycaster = new THREE.Raycaster();

    }
    generateMaterials(){
        Object.keys(this.sideColors).forEach((value) => {
            let canvas:HTMLCanvasElement = document.createElement("canvas");
            canvas.width = this.facePixelsSize;
            canvas.height = this.facePixelsSize;
            let ctx = canvas.getContext("2d");

            ctx.fillStyle = this.sideColors.background;
            ctx.fillRect(0, 0, this.facePixelsSize, this.facePixelsSize);
            ctx.fillStyle = this.sideColors[value];
            if(this.faceRoundedPixels != 0){
                canvasRoundedRect(ctx, this.faceInsetPixels, this.faceInsetPixels, this.facePixelsSize-this.faceInsetPixels*2, this.facePixelsSize-this.faceInsetPixels*2, this.faceRoundedPixels, true, undefined );
            }else{
                ctx.fillRect(this.faceInsetPixels, this.faceInsetPixels, this.facePixelsSize-this.faceInsetPixels*2, this.facePixelsSize-this.faceInsetPixels*2);
            }

            let canvasTexture = new THREE.CanvasTexture(canvas);
            this.sideMaterials[value] = new THREE.MeshBasicMaterial({map: canvasTexture});
        });
    }

    generateCubes(){
        this.cubes = new Map<string, THREE.Mesh>();
        this.cubesGroup = new THREE.Group();
        this.cubesEdgyGroup = new THREE.Group();
        const reducedCubeType = this.cubeType - 1;
        Object.keys(sides).forEach((value) => {
            for(let x = 0; x < this.cubeType; x++){
                for(let y = 0; y < this.cubeType; y++){
                    let coordinate:THREE.Vector3 ;
                    let coordinateString:string;
                    if(sides[value].x == 1){
                        coordinate = new THREE.Vector3(reducedCubeType, y, x);
                    }
                    else if(sides[value].x == -1){
                        coordinate = new THREE.Vector3(0, y, x);
                    }
                    if(sides[value].y == 1){
                        coordinate = new THREE.Vector3(x, reducedCubeType, y);
                    }
                    else if(sides[value].y == -1){
                        coordinate = new THREE.Vector3(x, 0, y);
                    }
                    if(sides[value].z == 1){
                        coordinate = new THREE.Vector3(x, y, reducedCubeType);
                    }
                    else if(sides[value].z == -1){
                        coordinate = new THREE.Vector3(x, y, 0);
                    }
                    coordinateString = coordinateToString(coordinate.x, coordinate.y, coordinate.z);

                    if(this.cubes.get(coordinateString) != undefined){
                        continue;
                    }

                    let geometry = new RoundedBoxGeometry(1, 1, 1, 5, this.cubeRoundedAmount);
                    let geometryEdgy = new BoxGeometry();
                    let mesh = new THREE.Mesh(geometry);
                    let meshEdgy = new THREE.Mesh(geometryEdgy);
                    mesh.position.copy(coordinate);
                    meshEdgy.position.copy(coordinate);

                    //is just the sides on a lower level, just the single mesh
                    let whichmaterials: sideMaterials = {
                        up: this.sideMaterials.background,
                        down: this.sideMaterials.background,
                        left: this.sideMaterials.background,
                        right: this.sideMaterials.background,
                        front: this.sideMaterials.background,
                        back: this.sideMaterials.background,
                        background: this.sideMaterials.background,
                    };

                    //set materials
                    if(coordinate.x == reducedCubeType){
                        whichmaterials.right = this.sideMaterials.right;
                    }
                    else if(coordinate.x == 0){
                        whichmaterials.left = this.sideMaterials.left;
                    }

                    if(coordinate.y == reducedCubeType){
                        whichmaterials.up = this.sideMaterials.up;
                    }
                    else if(coordinate.y == 0){
                        whichmaterials.down = this.sideMaterials.down;
                    }

                    if(coordinate.z == reducedCubeType){
                        whichmaterials.front = this.sideMaterials.front;
                    }
                    else if(coordinate.z == 0){
                        whichmaterials.back = this.sideMaterials.back;
                    }

                    mesh.material = [whichmaterials.right, whichmaterials.left, whichmaterials.up, whichmaterials.down, whichmaterials.front, whichmaterials.back];
                    this.cubes.set(coordinateString, mesh);
                    this.cubesGroup.add(mesh);
                    this.cubesEdgyGroup.add(meshEdgy);

                }
            }
        });
        this.cubesGroup.position.set(-( this.cubeType-1 )/2, -( this.cubeType-1 )/2, -( this.cubeType-1 )/2);
        this.cubesEdgyGroup.position.set(-( this.cubeType-1 )/2, -( this.cubeType-1 )/2, -( this.cubeType-1 )/2);
        this.cubesEdgyGroup.visible = false;
        this.scene.add(this.cubesGroup);
        this.scene.add(this.cubesEdgyGroup);
    }

    adjustCamera(camera: THREE.Camera, orbitControls: OrbitControls){
        camera.position.set(this.cubeType+1,this.cubeType+1,this.cubeType+1);
        orbitControls.update();

    }
    rotate(x, y){
        this.cubesGroup.rotation.x += x / 100;
        this.cubesGroup.rotation.y += y / 100;
    }

    raycastInitial(x, y){

        let vec2 = normalizeScreenPos(x, y);
        this.raycaster.setFromCamera(vec2, this.camera);

        const intersects = this.raycaster.intersectObjects(this.cubesEdgyGroup.children);


        if(intersects.length > 0){

           let temp = intersects[0];
           this.dragPlane.position.set(0,0,0);
           this.dragPlane.lookAt(temp.face.normal);
           this.dragPlane.position.copy(temp.point);
           this.scene.add(this.dragPlane);


        }
    }
    raycastUpdate(x, y){
        let vec2 = normalizeScreenPos(x, y);
        this.raycaster.setFromCamera(vec2, this.camera);

        const intersect = this.raycaster.intersectObject(this.dragPlane);
        if(intersect != undefined){
            // let pos = this.dragPlane.point;        

        }

    }
    raycastEnd(){

    }
}
