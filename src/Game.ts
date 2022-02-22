import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RubiksCube } from "./RubiksCube";
export class Game{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    orbitControls: OrbitControls;

    domElement: HTMLElement;

    geometry: THREE.BoxGeometry;
    // material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh;

    rubiksCube: RubiksCube;

    mouseX: number;
    mouseY: number;
    mouseDown: boolean;

    constructor(){
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor( 0x101015, 1);

        this.domElement = document.getElementById("three");
        this.domElement.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/ window.innerHeight, 0.1, 1000);
        this.camera.position.set(0,0,5);

        this.orbitControls = new OrbitControls(this.camera, this.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.2;
        this.orbitControls.enablePan = false;
        this.orbitControls.update();

        this.rubiksCube = new RubiksCube(this.scene, this.camera);
        this.rubiksCube.generateMaterials();
        this.rubiksCube.generateCubes();
        this.rubiksCube.adjustCamera(this.camera, this.orbitControls);

        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;

        // this.orbitControls.enabled = false;
        this.domElement.addEventListener("pointermove", (event)=>{
            if(!this.mouseDown) return;
            this.rubiksCube.raycastUpdate(event.clientX, event.clientY);
        } );

        this.domElement.addEventListener("mousedown",(event) => {
            this.mouseDown = true; 
            this.rubiksCube.raycastInitial(event.clientX, event.clientY);
        } ); 
        this.domElement.addEventListener("mouseup",(event) => {
            this.mouseDown = false; 
        } ); 

    }

    render(){
        requestAnimationFrame(this.render.bind(this));

        this.orbitControls.update();
        this.renderer.render(this.scene, this.camera);

    }
};
