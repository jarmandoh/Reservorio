import { AfterViewInit, Component, ElementRef, inject, OnDestroy, ViewChild, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { StoryData, TestStoryService } from './test-story.service';

@Component({
  selector: 'app-test',
  imports: [RouterLink],
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css'],
})
export class TestComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stage') stageRef!: ElementRef<HTMLElement>;

  private readonly storyService = inject(TestStoryService);

  readonly storyData = signal<StoryData | null>(null);
  readonly selectedPage = signal(0);
  readonly showIndex = signal(false);
  readonly isPlaying = signal(false);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly phaseLabel = signal('Una ciudad de posibilidades');

  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private map?: Group;
  private shop?: Group;
  private doorHinge?: Group;
  private book?: Group;
  private bookCoverHinge?: Group;
  private mapPin?: Group;
  private mapPulse?: Mesh;
  private resizeObserver?: ResizeObserver;
  private animationFrame = 0;
  private animationStart = 0;
  private hiddenAt: number | null = null;
  private storyRequest?: Subscription;
  private destroyed = false;
  private readonly duration = 13.5;
  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.hiddenAt = performance.now();
      cancelAnimationFrame(this.animationFrame);
      return;
    }

    if (this.hiddenAt !== null) {
      if (this.isPlaying()) this.animationStart += performance.now() - this.hiddenAt;
      this.hiddenAt = null;
    }
    if (this.isPlaying()) this.animationFrame = requestAnimationFrame(this.animate);
  };

  ngAfterViewInit(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.loadStoryData();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.storyRequest?.unsubscribe();
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    this.scene?.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if ('map' in material && material.map) material.map.dispose();
        material.dispose();
      }
    });
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.scene?.clear();
  }

  replay(): void {
    if (!this.scene || !this.camera || !this.renderer) return;
    this.showIndex.set(false);
    this.selectedPage.set(0);
    this.phaseLabel.set(this.storyData()?.intro.title ?? 'Una ciudad de posibilidades');
    this.animationStart = performance.now();
    this.isPlaying.set(true);
    cancelAnimationFrame(this.animationFrame);
    this.hiddenAt = document.visibilityState === 'hidden' ? this.animationStart : null;
    this.updateScene(0);
    this.renderer.render(this.scene, this.camera);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.updateScene(this.duration);
      this.finishAnimation();
      return;
    }

    if (this.hiddenAt === null) this.animationFrame = requestAnimationFrame(this.animate);
  }

  skipAnimation(): void {
    cancelAnimationFrame(this.animationFrame);
    this.updateScene(this.duration);
    this.finishAnimation();
  }

  selectPage(index: number): void {
    this.selectedPage.set(index);
  }

  loadStoryData(): void {
    this.storyRequest?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.storyRequest = this.storyService.load().subscribe({
      next: story => {
        if (this.destroyed) return;
        this.storyData.set(story);
        this.phaseLabel.set(story.intro.title);
        this.isLoading.set(false);
        this.initThree();
      },
      error: error => {
        if (this.destroyed) return;
        console.error('No se pudieron cargar los datos de la historia:', error);
        this.isLoading.set(false);
        this.errorMessage.set('No pudimos cargar los datos del libro. Revisa la URL y el acceso CORS.');
      },
    });
  }

  private readonly animate = (now: number): void => {
    if (this.destroyed || !this.isPlaying()) return;

    const elapsed = Math.min((now - this.animationStart) / 1000, this.duration);
    this.updateScene(elapsed);
    this.renderer?.render(this.scene!, this.camera!);

    if (elapsed >= this.duration) {
      this.finishAnimation();
      return;
    }
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private initThree(): void {
    try {
      const canvas = this.canvasRef.nativeElement;
      const stage = this.stageRef.nativeElement;
      const scene = new Scene();
      scene.background = new Color('#dfe9e1');
      this.scene = scene;

      const camera = new PerspectiveCamera(50, 1, 0.1, 500);
      this.camera = camera;

      this.addLighting(scene);
      this.map = this.createCityMap();
      const shopObjects = this.createShop();
      this.shop = shopObjects.shop;
      this.doorHinge = shopObjects.doorHinge;
      const bookObjects = this.createBook();
      this.book = bookObjects.book;
      this.bookCoverHinge = bookObjects.coverHinge;
      scene.add(this.map, this.shop, this.book);

      const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
      this.renderer = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.shadowMap.enabled = true;
      renderer.setClearColor('#dfe9e1');

      this.resizeObserver = new ResizeObserver(() => this.resizeRenderer());
      this.resizeObserver.observe(stage);
      this.resizeRenderer();
      this.replay();
    } catch (error) {
      console.error('No se pudo inicializar la escena 3D:', error);
      this.errorMessage.set('No pudimos iniciar la escena 3D en este dispositivo.');
    }
  }

  private addLighting(scene: Scene): void {
    const hemi = new HemisphereLight(0xe9f4ee, 0x52473c, 1.15);
    scene.add(hemi);

    const key = new DirectionalLight(0xfff1d7, 1.8);
    key.position.set(-18, 30, 22);
    key.castShadow = true;
    scene.add(key);

    const fill = new DirectionalLight(0x9bc9ff, 0.65);
    fill.position.set(16, 12, -12);
    scene.add(fill);
  }

  private createCityMap(): Group {
    const map = new Group();
    map.position.y = -0.12;
    const ground = new Mesh(new PlaneGeometry(180, 180), new MeshBasicMaterial({ color: '#e3eae0' }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    map.add(ground);

    const roadMaterial = new MeshBasicMaterial({ color: '#f5f0e7' });
    const roadMarkMaterial = new MeshBasicMaterial({ color: '#d9d2c5' });
    const roads = [
      { x: 0, z: -24, width: 11, depth: 180 },
      { x: -30, z: 0, width: 8, depth: 180, turn: Math.PI / 2 },
      { x: 32, z: 0, width: 7, depth: 180, turn: Math.PI / 2 },
      { x: 0, z: 28, width: 8, depth: 180 },
      { x: -12, z: -4, width: 5, depth: 92, turn: -0.5 },
    ];
    for (const road of roads) {
      const street = new Mesh(new PlaneGeometry(road.width, road.depth), roadMaterial);
      street.rotation.x = -Math.PI / 2;
      street.rotation.z = road.turn ?? 0;
      street.position.set(road.x, 0.04, road.z);
      map.add(street);

      if (road.width > 7) {
        const dash = new Mesh(new PlaneGeometry(0.24, 3.8), roadMarkMaterial);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(road.x, 0.06, road.z);
        map.add(dash);
      }
    }

    const blockColors = ['#dce8d6', '#d2e1d0', '#e8e3d6', '#cdddc9'];
    const positions = [
      [-54, -48, 18, 24],
      [-28, -55, 18, 22],
      [23, -53, 20, 23],
      [54, -46, 17, 26],
      [-55, -4, 18, 24],
      [55, -2, 18, 21],
      [-54, 47, 17, 26],
      [-27, 54, 20, 23],
      [29, 52, 19, 24],
      [56, 46, 17, 24],
    ];
    positions.forEach(([x, z, width, depth], index) => {
      const block = new Mesh(
        new BoxGeometry(width, 0.25, depth),
        new MeshBasicMaterial({ color: blockColors[index % blockColors.length] })
      );
      block.position.set(x, 0.13, z);
      map.add(block);
    });
    const park = new Mesh(new PlaneGeometry(22, 18), new MeshBasicMaterial({ color: '#b9d7ad' }));
    park.rotation.x = -Math.PI / 2;
    park.position.set(-43, 0.02, -44);
    map.add(park);
    this.addMapPin(map);
    return map;
  }

  private addMapPin(parent: Group): void {
    const pin = new Group();
    pin.position.set(0, 0.4, 0);
    const stem = new Mesh(
      new CylinderGeometry(0.13, 0.24, 2.1, 16),
      new MeshStandardMaterial({ color: '#c95c3d', roughness: 0.42 })
    );
    stem.position.y = 1;
    const head = new Mesh(
      new CylinderGeometry(0.78, 0.78, 0.28, 32),
      new MeshStandardMaterial({ color: '#fff8eb', roughness: 0.36 })
    );
    head.position.y = 2.12;
    head.rotation.x = Math.PI / 2;
    const dot = new Mesh(
      new CylinderGeometry(0.25, 0.25, 0.3, 24),
      new MeshStandardMaterial({ color: '#c95c3d', roughness: 0.36 })
    );
    dot.position.set(0, 2.13, 0.08);
    dot.rotation.x = Math.PI / 2;
    pin.add(stem, head, dot);
    parent.add(pin);
    this.mapPin = pin;

    const pulse = new Mesh(
      new RingGeometry(1, 1.16, 48),
      new MeshBasicMaterial({ color: '#c95c3d', transparent: true, opacity: 0.62, side: DoubleSide })
    );
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = 0.12;
    parent.add(pulse);
    this.mapPulse = pulse;
  }

  private createShop(): { shop: Group; doorHinge: Group } {
    const shop = new Group();
    shop.position.set(0, 0, 0);
    const wall = new MeshStandardMaterial({ color: '#e6d6bd', roughness: 0.88 });
    const trim = new MeshStandardMaterial({ color: '#f6eddf', roughness: 0.72 });
    const wood = new MeshStandardMaterial({ color: '#a65c42', roughness: 0.72 });
    const glass = new MeshStandardMaterial({ color: '#9dc5c0', roughness: 0.24, metalness: 0.04 });

    const floor = new Mesh(new BoxGeometry(15, 0.5, 16), new MeshStandardMaterial({ color: '#c8b59a' }));
    floor.position.set(0, 0.25, -1);
    floor.receiveShadow = true;
    shop.add(floor);

    const backWall = new Mesh(new BoxGeometry(15, 10, 0.6), wall);
    backWall.position.set(0, 5.4, -8.5);
    shop.add(backWall);
    const leftWall = new Mesh(new BoxGeometry(0.6, 10, 16), wall);
    leftWall.position.set(-7.2, 5.3, -1);
    shop.add(leftWall);
    const rightWall = leftWall.clone();
    rightWall.position.x = 7.2;
    shop.add(rightWall);

    const facadeLeft = new Mesh(new BoxGeometry(4.4, 9, 0.65), wall);
    facadeLeft.position.set(-5.1, 4.8, 6.6);
    shop.add(facadeLeft);
    const facadeRight = facadeLeft.clone();
    facadeRight.position.x = 5.1;
    shop.add(facadeRight);
    const header = new Mesh(new BoxGeometry(5.8, 3.1, 0.7), wall);
    header.position.set(0, 8.35, 6.6);
    shop.add(header);
    const awning = new Mesh(new BoxGeometry(13, 0.35, 1.15), wood);
    awning.position.set(0, 6.5, 6.9);
    shop.add(awning);
    const doorHinge = new Group();
    doorHinge.position.set(-1.17, 0.5, 6.5);
    const door = new Mesh(new BoxGeometry(2.35, 5.5, 0.28), wood);
    door.position.set(1.17, 2.75, 0);
    doorHinge.add(door);
    shop.add(doorHinge);
    const windowPane = new Mesh(new BoxGeometry(3, 3.5, 0.14), glass);
    windowPane.position.set(-5.1, 4.2, 6.98);
    shop.add(windowPane);
    const rightWindow = windowPane.clone();
    rightWindow.position.x = 5.1;
    shop.add(rightWindow);

    const sign = new Mesh(new BoxGeometry(6.2, 1.3, 0.35), trim);
    sign.position.set(0, 8.25, 7.02);
    shop.add(sign);

    for (const x of [-5.6, -3.8, 3.8, 5.6]) {
      const strip = new Mesh(new BoxGeometry(0.11, 3.55, 0.1), trim);
      strip.position.set(x, 4.2, 7.08);
      shop.add(strip);
    }

    const table = new Mesh(new BoxGeometry(13, 0.45, 4), new MeshStandardMaterial({ color: '#8b5b45' }));
    table.position.set(0, 2, -5.2);
    table.castShadow = true;
    shop.add(table);
    const tableLegMaterial = new MeshStandardMaterial({ color: '#6e4939' });
    for (const x of [-5.8, 5.8]) {
      const leg = new Mesh(new BoxGeometry(0.38, 2, 0.38), tableLegMaterial);
      leg.position.set(x, 1, -5.2);
      shop.add(leg);
    }

    const bookSpot = new Mesh(new BoxGeometry(10.5, 0.1, 3.2), new MeshStandardMaterial({ color: '#d9c7ab' }));
    bookSpot.position.set(-2.8, 2.29, -5.2);
    shop.add(bookSpot);

    return { shop, doorHinge };
  }

  private createBook(): { book: Group; coverHinge: Group } {
    const book = new Group();
    book.position.set(-2.8, 4.8, -5.3);
    book.visible = false;

    const pageMaterial = new MeshStandardMaterial({ color: '#fffaf0', roughness: 0.92, side: DoubleSide });
    const pages = new Mesh(new BoxGeometry(7.7, 5.2, 0.23), pageMaterial);
    pages.castShadow = true;
    pages.receiveShadow = true;
    book.add(pages);

    const pageSurface = new Mesh(
      new PlaneGeometry(7.35, 4.85),
      new MeshBasicMaterial({ map: this.createOpenPagesTexture(), side: DoubleSide })
    );
    pageSurface.position.z = 0.13;
    book.add(pageSurface);

    const spine = new Mesh(
      new BoxGeometry(0.45, 5.4, 0.32),
      new MeshStandardMaterial({ color: '#123a70', roughness: 0.65 })
    );
    spine.position.z = -0.16;
    book.add(spine);

    const rearCover = new Mesh(
      new BoxGeometry(7.95, 5.45, 0.23),
      new MeshStandardMaterial({ color: '#102d52', roughness: 0.58 })
    );
    rearCover.position.z = -0.29;
    book.add(rearCover);

    const coverHinge = new Group();
    coverHinge.position.set(-3.95, 0, 0.28);
    const cover = new Mesh(
      new BoxGeometry(7.9, 5.4, 0.22),
      new MeshStandardMaterial({
        color: '#174b87',
        roughness: 0.42,
        map: this.createCoverTexture(),
        side: DoubleSide,
      })
    );
    cover.position.set(3.95, 0, 0);
    cover.castShadow = true;
    coverHinge.add(cover);
    book.add(coverHinge);

    const goldEdge = new Mesh(
      new BoxGeometry(7.8, 0.08, 0.07),
      new MeshStandardMaterial({ color: '#d8bd81', metalness: 0.42, roughness: 0.4 })
    );
    goldEdge.position.set(0, -2.55, -0.1);
    book.add(goldEdge);

    return { book, coverHinge };
  }

  private createOpenPagesTexture(): CanvasTexture {
    const canvas = this.canvasRef.nativeElement.ownerDocument.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 920;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear el contenido de las páginas');

    context.fillStyle = '#fffaf0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#dfd1b8';
    context.fillRect(696, 54, 8, 812);

    const story = this.storyData();
    if (!story) throw new Error('No hay datos cargados para el libro');

    context.fillStyle = '#a76443';
    context.font = '600 25px Georgia, serif';
    context.fillText(`RESÉRVAME  /  ${story.edition}`, 88, 105, 530);
    context.fillStyle = '#18395e';
    context.font = '700 60px Georgia, serif';
    context.fillText(story.book.contentsTitle, 88, 205, 530);

    context.font = '500 30px Georgia, serif';
    const rowSpacing = Math.min(112, 510 / story.pages.length);
    story.pages.forEach((page, index) => {
      const y = 315 + index * rowSpacing;
      context.fillStyle = '#ba7652';
      context.fillText(page.number, 90, y, 58);
      context.fillStyle = '#29394a';
      context.fillText(page.title, 160, y, 470);
      context.fillStyle = '#8c887f';
      context.font = '400 19px Georgia, serif';
      context.fillText(page.description, 160, y + 32, 470);
      context.font = '500 30px Georgia, serif';
      context.strokeStyle = '#ded4c3';
      context.setLineDash([3, 9]);
      context.beginPath();
      context.moveTo(160, y + 56);
      context.lineTo(620, y + 56);
      context.stroke();
      context.setLineDash([]);
    });

    context.fillStyle = '#a76443';
    context.font = '600 25px Georgia, serif';
    context.fillText(story.book.featureEyebrow, 780, 105, 530);
    context.fillStyle = '#18395e';
    context.font = '700 44px Georgia, serif';
    context.fillText(story.book.featureTitle, 780, 205, 530);
    context.fillStyle = '#5b5d5a';
    context.font = '400 26px Georgia, serif';
    story.book.featureLines.forEach((line, index) => context.fillText(line, 780, 310 + index * 40, 530));

    context.fillStyle = '#dbe7db';
    context.beginPath();
    context.arc(1050, 590, 145, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#c95c3d';
    context.beginPath();
    context.arc(1050, 560, 25, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(1034, 578);
    context.lineTo(1050, 632);
    context.lineTo(1066, 578);
    context.closePath();
    context.fill();
    context.fillStyle = '#667c67';
    context.font = 'italic 22px Georgia, serif';
    context.fillText(story.book.caption, 780, 810, 530);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }

  private createCoverTexture(): CanvasTexture {
    const canvas = this.canvasRef.nativeElement.ownerDocument.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear la portada del libro');

    const gradient = context.createLinearGradient(0, 0, 1024, 720);
    gradient.addColorStop(0, '#245e9b');
    gradient.addColorStop(1, '#102d52');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#c7aa71';
    context.lineWidth = 5;
    context.strokeRect(42, 42, 940, 636);

    context.fillStyle = '#dec890';
    context.textAlign = 'center';
    context.font = '600 28px Georgia, serif';
    const story = this.storyData();
    if (!story) throw new Error('No hay datos cargados para la portada');
    context.fillText(story.edition, 512, 205, 850);
    context.fillStyle = '#fffaf0';
    context.font = '700 75px Georgia, serif';
    context.fillText(story.book.coverTitle, 512, 330, 850);
    context.fillStyle = '#dec890';
    context.font = 'italic 29px Georgia, serif';
    context.fillText(story.book.coverSubtitle, 512, 510, 850);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }

  private updateScene(elapsed: number): void {
    if (!this.camera || !this.map || !this.shop || !this.book || !this.bookCoverHinge || !this.doorHinge) return;
    const camera = this.camera;
    const phaseOne = this.segment(elapsed, 0, 4.2);
    const phaseTwo = this.segment(elapsed, 4.2, 7.1);
    const phaseThree = this.segment(elapsed, 7.1, 9.3);
    const phaseFour = this.segment(elapsed, 9.3, this.duration);

    const cameraPosition = new Vector3();
    const lookTarget = new Vector3();
    if (elapsed < 4.2) {
      cameraPosition.set(
        MathUtils.lerp(-24, 0, this.ease(phaseOne)),
        MathUtils.lerp(76, 34, this.ease(phaseOne)),
        MathUtils.lerp(116, 43, this.ease(phaseOne))
      );
      lookTarget.set(0, 0, 0);
      this.phaseLabel.set(this.storyData()?.intro.title ?? 'Una ciudad de posibilidades');
    } else if (elapsed < 7.1) {
      cameraPosition.set(
        MathUtils.lerp(0, 0, this.ease(phaseTwo)),
        MathUtils.lerp(34, 12, this.ease(phaseTwo)),
        MathUtils.lerp(43, 18, this.ease(phaseTwo))
      );
      lookTarget.set(0, MathUtils.lerp(0, 3.5, this.ease(phaseTwo)), 0);
      this.phaseLabel.set('Acercándonos a la tienda');
    } else if (elapsed < 9.3) {
      cameraPosition.set(
        0,
        MathUtils.lerp(12, 5.4, this.ease(phaseThree)),
        MathUtils.lerp(18, 1, this.ease(phaseThree))
      );
      lookTarget.set(0, 3.8, MathUtils.lerp(0, -5.2, this.ease(phaseThree)));
      this.phaseLabel.set('Entrando a descubrir una historia');
    } else {
      cameraPosition.set(
        0,
        MathUtils.lerp(5.4, 7.2, this.ease(phaseFour)),
        MathUtils.lerp(1, 3.5, this.ease(phaseFour))
      );
      lookTarget.set(0, 4.8, -5.2);
      this.phaseLabel.set(elapsed < 11.7 ? 'Abriendo el libro azul' : 'El índice de la historia');
    }

    camera.position.copy(cameraPosition);
    camera.lookAt(lookTarget);
    camera.updateProjectionMatrix();

    if (this.mapPin) {
      this.mapPin.scale.setScalar(1 + Math.sin(elapsed * 3.5) * 0.08);
      this.mapPin.visible = elapsed < 7.5;
    }
    if (this.mapPulse) {
      const pulse = (elapsed * 0.55) % 1;
      this.mapPulse.scale.setScalar(0.55 + pulse * 1.45);
      const material = this.mapPulse.material as MeshBasicMaterial;
      material.opacity = 0.62 * (1 - pulse);
      this.mapPulse.visible = elapsed < 7.5;
    }

    const storeScale = elapsed < 4.2 ? 1 : MathUtils.lerp(1, 0.96, this.ease(phaseThree));
    this.shop.scale.setScalar(storeScale);
    this.shop.visible = elapsed < 10;
    this.doorHinge.rotation.y = MathUtils.lerp(0, -1.15, this.ease(phaseThree));

    this.book.visible = elapsed >= 8.2;
    const bookReveal = this.ease(this.segment(elapsed, 8.2, 10.2));
    this.book.scale.setScalar(MathUtils.lerp(0.08, 1, bookReveal));
    this.book.position.y = 4.8 + Math.sin(elapsed * 2.2) * 0.035 * bookReveal;
    this.bookCoverHinge.rotation.y = MathUtils.lerp(0, Math.PI * 0.49, this.ease(this.segment(elapsed, 9.5, 11.7)));
  }

  private segment(value: number, start: number, end: number): number {
    return MathUtils.clamp((value - start) / (end - start), 0, 1);
  }

  private ease(value: number): number {
    return value * value * (3 - 2 * value);
  }

  private resizeRenderer(): void {
    const renderer = this.renderer;
    const camera = this.camera;
    if (!renderer || !camera || this.destroyed) return;
    const { width, height } = this.stageRef.nativeElement.getBoundingClientRect();
    if (!width || !height) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(this.scene!, camera);
  }

  private finishAnimation(): void {
    this.isPlaying.set(false);
    this.showIndex.set(true);
    this.phaseLabel.set('El índice de la historia');
    this.renderer?.render(this.scene!, this.camera!);
  }
}
