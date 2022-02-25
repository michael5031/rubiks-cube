import * as THREE from "three";
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {coordinateToString, sides, canvasRoundedRect, normalizeScreenPos, radToDeg, degToRad} from "./utils";
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
    cubesEdgy: any; //map<string, mesh> "0:1:0"
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

    dragObject: THREE.Mesh;
    dragDirection: string;
    dragIntersection: THREE.Intersection;
    dragPlane: THREE.Mesh;
    dragPoint: THREE.Vector3;

    dragLineX: THREE.Line3;
    dragLineY: THREE.Line3;

    dragLineXLower: THREE.Line3;
    dragLineXUpper: THREE.Line3;

    dragLineYLower: THREE.Line3;
    dragLineYUpper: THREE.Line3;

    raycaster: THREE.Raycaster; 

    dragRotationX: number;
    startedRotationX: number;

   tempGroupEdgy: THREE.Group;
   tempGroup: THREE.Group;

   tempGroupArray: THREE.Mesh[];
   tempGroupEdgyArray: THREE.Mesh[];

   rotationAxis:string;  

   calledUpdate: boolean;

   geometry: any;
   geometryEdgy: THREE.BoxGeometry;
    
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
        //nord
        /* this.sideColors = { 
            up:"#DBDEE9",
            down: "#EBCB8B",
           left: "#D08770",
            right: "#BF616A",
            front: "#8FBCBB",
            back: "#91A1C1",
            background: "#434C5E",
        }
        */
        /* this.sideColors = { 
            up: "#fafafa",
            down: "#fdcc60",
            left: "#ec7171",
            right: "#f08778",
            front: "#53bf97",
            back: "#60b8d6",
            background: "#1f2430",
        } */
        /* this.sideColors = { 
            up: "#000000",
            down: "#202020",
            left: "#404040",
            right: "#606060",
            front: "#808080",
            back: "#A0A0A0",
            background: "#C0C0C0",
        } */
        /* this.sideColors = { 
            up: "#A0A0A0",
            down: "#A0A0A0",
            left: "#A0A0A0",
            right: "#A0A0A0",
            front: "#A0A0A0",
            back: "#A0A0A0",
            background: "#A0A0A0",
        } */


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
        this.faceRoundedPixels = 10;

        this.cubeRoundedAmount = 0.1;

        let dragGeometry = new THREE.PlaneGeometry(10000, 10000, 1, 1);
        // let dragGeometry = new THREE.BoxGeometry(1, 10, 1, 10, 10, 10);
        this.dragPlane = new THREE.Mesh(dragGeometry, new THREE.MeshBasicMaterial({color: 0x404040}));

        this.raycaster = new THREE.Raycaster();
        this.dragPoint = new THREE.Vector3();

        this.geometry = new RoundedBoxGeometry(1, 1, 1, 5, this.cubeRoundedAmount);
        this.geometryEdgy = new BoxGeometry();

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
        this.cubesEdgy = new Map<string, THREE.Mesh>();
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

                    let mesh = new THREE.Mesh(this.geometry);
                    let meshEdgy = new THREE.Mesh(this.geometryEdgy);
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
                    meshEdgy.name = meshEdgy.position.x.toString();
                    this.cubesEdgy.set(coordinateString, meshEdgy);
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

    raycastInitial(x: number, y: number): boolean{

        let vec2 = normalizeScreenPos(x, y);
        this.raycaster.setFromCamera(vec2, this.camera);

        const intersects = this.raycaster.intersectObjects(this.cubesEdgyGroup.children);

        this.tempGroupArray = [];
        this.tempGroupEdgyArray = [];

        if(intersects.length > 0){

           let temp = intersects[0];

           let r = temp.face.normal;
           r.applyEuler(temp.object.rotation);
           r.x = Math.round(r.x);
           r.y = Math.round(r.y);
           r.z = Math.round(r.z);
           /* if(r.z == 1 || r.z == -1){
               this.rotationAxis = "x";
           }
           else if(r.y == 1 || r.y == -1){
               this.rotationAxis = "x";
           } */

           this.dragIntersection = temp;
           this.dragPlane.position.set(0,0,0);



           // this.dragPlane.position.copy(temp.point);
           this.dragPlane.lookAt(temp.face.normal);

           this.dragPoint = temp.point;
           this.dragPlane.position.set(temp.point.x, temp.point.y, temp.point.z);
           this.dragPlane.updateMatrix();
           this.dragPlane.updateMatrixWorld(true);
           

           let v = new THREE.Vector3();
           let v1 = new THREE.Vector3();

           let v2 = new THREE.Vector3();
           let v3 = new THREE.Vector3();

           let buf = this.dragPlane.geometry.attributes.position;
           v.fromBufferAttribute(buf,0);
           v1.fromBufferAttribute(buf,1);

           v2.fromBufferAttribute(buf,2);
           v3.fromBufferAttribute(buf,3);

           let vWorld = this.dragPlane.localToWorld(v);
           let v1World = this.dragPlane.localToWorld(v1);

           let v2World = this.dragPlane.localToWorld(v2);
           let v3World = this.dragPlane.localToWorld(v3);

           let line1 = new THREE.Line3(vWorld, v1World);
           let line2 = new THREE.Line3(v2World, v3World);

           let hline1 = new THREE.Line3(vWorld, v2World);
           let hline2 = new THREE.Line3(v1World, v3World);

           let center1 = new THREE.Vector3();
           let center2 = new THREE.Vector3();

           let hcenter1 = new THREE.Vector3();
           let hcenter2 = new THREE.Vector3();

           line1.getCenter(center1);
           line2.getCenter(center2);

           hline1.getCenter(hcenter1);
           hline2.getCenter(hcenter2);

           let lineX = new THREE.Line3(center1.add(temp.point), center2.add(temp.point));
           this.dragLineX = lineX;
           let lineY = new THREE.Line3(hcenter1.add(temp.point), hcenter2.add(temp.point));
           this.dragLineY = lineY;

           this.dragPoint = temp.point;

           this.dragLineXLower = new THREE.Line3(center1.add(temp.point), this.dragPoint);
           this.dragLineXUpper = new THREE.Line3(center2.add(temp.point), this.dragPoint);

           this.dragLineYLower = new THREE.Line3(hcenter1.add(temp.point), this.dragPoint);
           this.dragLineYUpper = new THREE.Line3(hcenter2.add(temp.point), this.dragPoint);

           

           this.scene.add(this.dragPlane);
           this.dragPlane.visible = false;
           // console.log(this.dragIntersection);



           return true;

        }
        return false;
    }

    raycastDirection(intersect: THREE.Intersection){
        let xUpper = new THREE.Vector3();
        let xLower = new THREE.Vector3();
        let yUpper = new THREE.Vector3();
        let yLower = new THREE.Vector3();
        this.dragLineXUpper.closestPointToPoint(intersect.point, true, xUpper);
        this.dragLineXLower.closestPointToPoint(intersect.point, true, xLower);
        this.dragLineYUpper.closestPointToPoint(intersect.point, true, yUpper);
        this.dragLineYLower.closestPointToPoint(intersect.point, true, yLower);

        let xUpperDistance = xUpper.distanceTo(this.dragPoint);
        let xLowerDistance = xLower.distanceTo(this.dragPoint);
        let yUpperDistance = yUpper.distanceTo(this.dragPoint);
        let yLowerDistance = yLower.distanceTo(this.dragPoint);

        let direction:string = "";
        if(( xUpperDistance > 0.05|| xLowerDistance > 0.05  )&&( ( xUpperDistance > yLowerDistance && xUpperDistance > yUpperDistance  ) || ( xLowerDistance > yLowerDistance && xLowerDistance > yUpperDistance  )  )){
            direction = "x";
        }
        else if(( yUpperDistance > 0.05 || yLowerDistance > 0.05  )&&( ( yUpperDistance > xLowerDistance && yUpperDistance > xUpperDistance  ) || ( yLowerDistance > xLowerDistance && yLowerDistance > xUpperDistance  ) )){
            direction = "y";
        }else{
            return;
        }
            this.dragDirection = direction;

        let n = this.dragIntersection.face.normal;
        if(( n.z == 1 || n.z == -1  || n.y == 1 || n.y == -1)&& direction == "x"){
            this.rotationAxis = "x";
        }

        if(( n.z == 1 || n.z == -1  || n.x == 1 || n.x == -1)&& direction == "y"){
            this.rotationAxis = "y";
        }

        if(( ( ( n.x == 1 || n.x == -1  ) && direction == "x" ) || ( ( n.y == 1 || n.y == -1 ) && direction == "y" ) )){
            this.rotationAxis = "z";
        }


       this.tempGroupEdgy = new THREE.Group();
       this.tempGroup = new THREE.Group();
       let originOffset = ( this.cubeType/2 ) - 0.5;
       let offsetVector:THREE.Vector3 = new THREE.Vector3();
       if(this.rotationAxis == "x"){
           offsetVector = new THREE.Vector3(0, originOffset, originOffset);
       }
       else if(this.rotationAxis == "y"){
           offsetVector = new THREE.Vector3(originOffset, 0, originOffset);
       }
       else if(this.rotationAxis == "z"){
           offsetVector = new THREE.Vector3(originOffset, originOffset, 0);
       }
       for(let x = 0; x < this.cubeType; x++){
           for(let y = 0; y < this.cubeType; y++){
                   const dx = this.dragIntersection.object.position.x;
                   const dy = this.dragIntersection.object.position.y;
                   const dz = this.dragIntersection.object.position.z;
                   let coordinatePosition:string;
                   if(this.rotationAxis == "x"){
                       coordinatePosition = coordinateToString(Math.round(dx), x, y);
                   }
                   else if(this.rotationAxis == "y"){
                       coordinatePosition = coordinateToString(x, Math.round(dy), y);
                   }
                   else if(this.rotationAxis == "z"){
                       coordinatePosition = coordinateToString(x, y, Math.round(dz));
                   }
                   if(this.cubes.get(coordinatePosition) == undefined){
                       continue;
                   }
                    let cu = this.cubes.get(coordinatePosition);
                    this.tempGroup.add(cu);
                    this.tempGroupArray.push(cu);
                    cu.position.set(Math.round( cu.position.x )-offsetVector.x, Math.round( cu.position.y )-offsetVector.y, Math.round( cu.position.z )-offsetVector.z);

                    let cuEdgy = this.cubesEdgy.get(coordinatePosition);
                    this.tempGroupEdgy.add(cuEdgy);
                    this.tempGroupEdgyArray.push(cuEdgy);
                    cuEdgy.position.set(Math.round( cuEdgy.position.x )-offsetVector.x, Math.round( cuEdgy.position.y )-offsetVector.y, Math.round( cuEdgy.position.z )-offsetVector.z);
               }

       }
       this.scene.add(this.tempGroup);
       this.scene.add(this.tempGroupEdgy);
       this.tempGroupEdgy.visible = false;
       let newPos = new THREE.Vector3(Math.round( this.cubesGroup.position.x )+offsetVector.x, Math.round( this.cubesGroup.position.y )+offsetVector.y, Math.round( this.cubesGroup.position.z )+offsetVector.z);
       this.tempGroup.position.copy(newPos);
       this.tempGroupEdgy.position.copy(newPos);

       this.dragObject = this.tempGroupEdgy as any;

       this.startedRotationX = this.dragObject.rotation.x;

    }
    raycastUpdate(x: number, y:number){
        this.calledUpdate = true;
        let vec2 = normalizeScreenPos(x, y);
        this.raycaster.setFromCamera(vec2, this.camera);


        const intersect = this.raycaster.intersectObject(this.dragPlane);
        if(intersect.length > 0){
            let pos = intersect[0].point;
            
            if(this.tempGroupEdgy == undefined){
                this.raycastDirection(intersect[0]);
                return;
            }

           let lower = new THREE.Vector3();
           let upper = new THREE.Vector3();

           if(this.dragDirection == "x"){
               this.dragLineXLower.closestPointToPoint(pos, true, lower);
               this.dragLineXUpper.closestPointToPoint(pos, true, upper);
           }else{
               this.dragLineYLower.closestPointToPoint(pos, true, lower);
               this.dragLineYUpper.closestPointToPoint(pos, true, upper);
           }

           /* let lineMesh=new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([this.dragLineXLower.start, this.dragLineXLower.end]),//the line3 geometry you have yet
                new THREE.LineBasicMaterial({color:0xffff00})//basic blue color as material
            );
            this.scene.add(lineMesh);

           let lineMesh1=new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([this.dragLineXUpper.start, this.dragLineXUpper.end]),//the line3 geometry you have yet
                new THREE.LineBasicMaterial({color:0xff00ff})//basic blue color as material
            );

            this.scene.add(lineMesh1);

           let hlineMesh=new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([this.dragLineYUpper.start, this.dragLineYUpper.end]),//the line3 geometry you have yet
                new THREE.LineBasicMaterial({color:0xff0000})//basic blue color as material
            );
            this.scene.add(hlineMesh);

           let hlineMesh1=new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([this.dragLineYLower.start, this.dragLineYLower.end]),//the line3 geometry you have yet
                new THREE.LineBasicMaterial({color:0x00ffff})//basic blue color as material
            );
            this.scene.add(hlineMesh1); */

           let distanceBetweenPointLower: THREE.Line3;
           let distanceBetweenPointUpper: THREE.Line3;

           if((this.dragDirection == "x" && this.dragIntersection.face.normal.x == 1 ) || (this.dragDirection == "y" && this.dragIntersection.face.normal.y == 1 )|| (this.dragDirection == "x" && this.dragIntersection.face.normal.z == -1 ) ){
               distanceBetweenPointLower = new THREE.Line3(this.dragPoint, upper);
               distanceBetweenPointUpper = new THREE.Line3(this.dragPoint, lower);
           }else{
               distanceBetweenPointLower = new THREE.Line3(this.dragPoint, lower);
               distanceBetweenPointUpper = new THREE.Line3(this.dragPoint, upper);
           }

           if(distanceBetweenPointLower.distance() > distanceBetweenPointUpper.distance()){
               this.dragRotationX = -distanceBetweenPointLower.distance();
           }else{
               this.dragRotationX = distanceBetweenPointUpper.distance();
           }

           // this.dragRotationX = distanceBetweenPoint.distance();
           let amountOfRotation = 20/this.camera.position.distanceTo(pos);

           let coordinate = coordinateToString(this.dragObject.position.x, this.dragObject.position.y, this.dragObject.position.z);
           this.tempGroup.rotation[this.rotationAxis] = ( this.startedRotationX + this.dragRotationX*amountOfRotation/5 ) ;
           this.tempGroupEdgy.rotation[this.rotationAxis] = ( this.startedRotationX + this.dragRotationX*amountOfRotation/5 ) ;
 
           // mesh1.position.copy(lo);
           // mesh1.scale.copy(new THREE.Vector3(0.1, 0.1, 0.1));

           // this.scene.add(mesh1);

        }

    }
    raycastEnd(){
        // if(this.calledUpdate == false){
            // return;
        // }
        let rotation:number = radToDeg( this.tempGroup.rotation[this.rotationAxis], true);
        this.tempGroup.rotation[this.rotationAxis] = degToRad( Math.floor( ( rotation+45 )/90 ) * 90 );
        this.tempGroupEdgy.rotation[this.rotationAxis] = degToRad( Math.floor(( rotation+45 )/90) * 90 );
        for(let i = 0; i < this.tempGroupArray.length; i++){
            this.cubesGroup.attach(this.tempGroupArray[i]);
            let c = this.tempGroupArray[i];
            c.position.x = Math.round( c.position.x );
            c.position.y = Math.round( c.position.y );
            c.position.z = Math.round( c.position.z );
            this.cubes.set(coordinateToString(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z)), c);
        }
        for(let i = 0; i < this.tempGroupEdgyArray.length; i++){
            this.cubesEdgyGroup.attach(this.tempGroupEdgyArray[i]);
            let c = this.tempGroupEdgyArray[i];
            c.position.x = Math.round( c.position.x );
            c.position.y = Math.round( c.position.y );
            c.position.z = Math.round( c.position.z );
            this.cubesEdgy.set(coordinateToString(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z)), c);
            // this.tempGroupEdgyArray[i].visible = true;
        }
        this.tempGroupEdgy = undefined;
        this.tempGroup = undefined;
        this.calledUpdate = false;
    }
}
