import { AfterViewInit, Component, ElementRef, inject, OnDestroy, ViewChild, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
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

  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private book?: Group;
  private bookCoverHinge?: Group;
  private bookPages?: Mesh;
  private bookRearCover?: Mesh;
  private bookEdge?: Mesh;
  private pageSurface?: Mesh;
  private pageTurn?: Group;
  private pageTurnMesh?: Mesh;
  private pageTurnBasePositions?: Float32Array;
  private pageTurnTween?: gsap.core.Tween;
  private resizeObserver?: ResizeObserver;
  private animationFrame = 0;
  private animationStart = 0;
  private hiddenAt: number | null = null;
  private storyRequest?: Subscription;
  private destroyed = false;
  private readonly duration = 7.2;
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
    this.pageTurnTween?.kill();
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
    this.pageTurnTween?.kill();
    if (this.pageTurn) {
      this.pageTurn.visible = false;
      this.pageTurn.rotation.y = 0;
      this.deformPage(0);
    }
    this.showIndex.set(false);
    this.selectedPage.set(0);
    this.refreshOpenPages();
    this.refreshPageTurnTexture();
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
    const pages = this.storyData()?.pages ?? [];
    if (!Number.isInteger(index) || index < 0 || index >= pages.length || index === this.selectedPage()) return;

    this.pageTurnTween?.kill();
    if (this.pageTurn) {
      this.pageTurn.visible = false;
      this.pageTurn.rotation.y = 0;
      this.deformPage(0);
    }
    const previousPage = this.selectedPage();
    const canAnimate =
      !!this.pageTurn && !!this.pageTurnMesh && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousTexture = canAnimate
      ? (this.pageSurface?.material as MeshStandardMaterial | undefined)?.map?.clone()
      : undefined;
    this.selectedPage.set(index);
    this.refreshOpenPages();

    if (!canAnimate || !this.pageTurn || !this.pageTurnMesh) {
      previousTexture?.dispose();
      this.refreshPageTurnTexture();
      if (this.scene && this.camera) this.renderer?.render(this.scene, this.camera);
      return;
    }

    const material = this.pageTurnMesh.material as MeshStandardMaterial;
    material.map?.dispose();
    material.map = previousTexture ?? this.createOpenPagesTexture();
    material.map.repeat.set(0.5, 1);
    material.map.offset.set(0.5, 0);
    material.map.needsUpdate = true;
    material.needsUpdate = true;
    this.pageTurn.visible = true;
    this.pageTurn.rotation.y = 0;
    this.deformPage(0);
    this.pageTurnTween = gsap.to(this.pageTurn.rotation, {
      y: index > previousPage ? -Math.PI : Math.PI,
      duration: 1.05,
      ease: 'power3.inOut',
      onUpdate: () => {
        this.deformPage(this.pageTurn?.rotation.y ?? 0);
        if (this.scene && this.camera) this.renderer?.render(this.scene, this.camera);
      },
      onComplete: () => {
        if (!this.pageTurn || !this.pageTurnMesh) return;
        this.pageTurn.visible = false;
        this.pageTurn.rotation.y = 0;
        this.deformPage(0);
        this.refreshPageTurnTexture();
        if (this.scene && this.camera) this.renderer?.render(this.scene, this.camera);
      },
    });
  }

  loadStoryData(): void {
    this.storyRequest?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.storyRequest = this.storyService.load().subscribe({
      next: story => {
        if (this.destroyed) return;
        this.storyData.set(story);
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
      scene.background = null;
      this.scene = scene;

      const camera = new PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(-2.2, 0, 28);
      camera.lookAt(-2.2, 0, 0);
      this.camera = camera;

      this.addLighting(scene);
      const bookObjects = this.createBook();
      this.book = bookObjects.book;
      this.bookCoverHinge = bookObjects.coverHinge;
      this.bookPages = bookObjects.pages;
      this.bookRearCover = bookObjects.rearCover;
      this.bookEdge = bookObjects.edge;
      this.pageSurface = bookObjects.pageSurface;
      this.pageTurn = bookObjects.pageTurn;
      this.pageTurnMesh = bookObjects.pageTurnMesh;
      scene.add(this.book);

      const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFShadowMap;
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor(0x000000, 0);

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
    const hemi = new HemisphereLight(0xf7f2e8, 0x65533f, 1.8);
    scene.add(hemi);

    const key = new DirectionalLight(0xfff0d4, 2.5);
    key.position.set(-7, 12, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 100;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.025;
    scene.add(key);

    const fill = new DirectionalLight(0xb9d2ff, 0.8);
    fill.position.set(8, 6, -10);
    scene.add(fill);
  }

  private createBook(): {
    book: Group;
    coverHinge: Group;
    pages: Mesh;
    rearCover: Mesh;
    edge: Mesh;
    pageSurface: Mesh;
    pageTurn: Group;
    pageTurnMesh: Mesh;
  } {
    const book = new Group();
    book.position.set(-2.2, 0, 0);
    book.visible = false;

    const pageMaterial = new MeshStandardMaterial({ color: '#fffaf0', roughness: 0.92, side: DoubleSide });
    const pages = new Mesh(new BoxGeometry(7.7, 5.2, 0.23), pageMaterial);
    pages.position.x = 1.925;
    pages.scale.x = 0.5;
    pages.castShadow = true;
    pages.receiveShadow = true;
    book.add(pages);

    const pageSurface = new Mesh(
      new PlaneGeometry(7.35, 4.85),
      new MeshStandardMaterial({ map: this.createOpenPagesTexture(), roughness: 0.94, side: DoubleSide })
    );
    pageSurface.position.set(1.8375, 0, 0.13);
    pageSurface.scale.x = 0.5;
    (pageSurface.material as MeshStandardMaterial).map?.repeat.set(0.5, 1);
    (pageSurface.material as MeshStandardMaterial).map?.offset.set(0.5, 0);
    book.add(pageSurface);

    const pageTurn = new Group();
    pageTurn.position.set(0, 0, 0.16);
    const pageTurnGeometry = new PlaneGeometry(3.675, 4.85, 24, 1);
    this.pageTurnBasePositions = Float32Array.from(pageTurnGeometry.getAttribute('position').array);
    const pageTurnMesh = new Mesh(
      pageTurnGeometry,
      new MeshStandardMaterial({ map: this.createOpenPagesTexture(), roughness: 0.94, side: DoubleSide })
    );
    pageTurnMesh.position.x = 1.8375;
    pageTurnMesh.castShadow = true;
    pageTurn.add(pageTurnMesh);
    pageTurn.visible = false;
    book.add(pageTurn);

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
    rearCover.position.set(1.9875, 0, -0.29);
    rearCover.scale.x = 0.5;
    book.add(rearCover);

    const coverHinge = new Group();
    coverHinge.position.set(0, 0, 0.28);
    const cover = new Mesh(
      new BoxGeometry(3.9, 5.4, 0.22),
      new MeshStandardMaterial({ color: '#174b87', roughness: 0.42 })
    );
    cover.position.set(1.95, 0, 0);
    cover.castShadow = true;
    coverHinge.add(cover);

    const coverArtwork = new Mesh(
      new PlaneGeometry(3.78, 5.28),
      new MeshStandardMaterial({ map: this.createCoverTexture(), roughness: 0.42 })
    );
    coverArtwork.position.set(1.95, 0, 0.113);
    coverHinge.add(coverArtwork);

    const innerCover = new Mesh(
      new PlaneGeometry(3.78, 5.28),
      new MeshStandardMaterial({ color: '#e6d7bd', roughness: 0.9 })
    );
    innerCover.position.set(1.95, 0, -0.113);
    innerCover.rotation.y = Math.PI;
    coverHinge.add(innerCover);
    book.add(coverHinge);

    const goldEdge = new Mesh(
      new BoxGeometry(7.8, 0.08, 0.07),
      new MeshStandardMaterial({ color: '#d8bd81', metalness: 0.42, roughness: 0.4 })
    );
    goldEdge.position.set(1.95, -2.55, -0.1);
    goldEdge.scale.x = 0.5;
    book.add(goldEdge);

    return { book, coverHinge, pages, rearCover, edge: goldEdge, pageSurface, pageTurn, pageTurnMesh };
  }

  private deformPage(angle: number): void {
    const geometry = this.pageTurnMesh?.geometry;
    const base = this.pageTurnBasePositions;
    if (!geometry || !base) return;
    const positions = geometry.getAttribute('position') as BufferAttribute;
    const curl = Math.sin(Math.abs(angle)) * 0.62;
    for (let index = 0; index < positions.count; index += 1) {
      const x = base[index * 3];
      const progress = (x + 3.675 / 2) / 3.675;
      positions.setXYZ(index, x, base[index * 3 + 1], curl * Math.sin(Math.PI * progress));
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private refreshOpenPages(): void {
    if (!this.pageSurface) return;
    const material = this.pageSurface.material as MeshStandardMaterial;
    material.map?.dispose();
    material.map = this.createOpenPagesTexture();
    material.needsUpdate = true;
  }

  private refreshPageTurnTexture(): void {
    if (!this.pageTurnMesh) return;
    const material = this.pageTurnMesh.material as MeshStandardMaterial;
    material.map?.dispose();
    material.map = this.createOpenPagesTexture();
    material.map.repeat.set(0.5, 1);
    material.map.offset.set(0.5, 0);
    material.map.needsUpdate = true;
    material.needsUpdate = true;
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

    const currentPage = story.pages[this.selectedPage()] ?? story.pages[0];
    context.fillStyle = '#a76443';
    context.font = '600 25px Georgia, serif';
    context.fillText(`${story.book.featureEyebrow}  /  ${currentPage.number}`, 780, 105, 530);
    context.fillStyle = '#18395e';
    context.font = '700 44px Georgia, serif';
    context.fillText(currentPage.title, 780, 205, 530);
    context.fillStyle = '#5b5d5a';
    context.font = '400 26px Georgia, serif';
    context.fillText(currentPage.description, 780, 270, 530);
    context.font = '400 22px Georgia, serif';
    this.wrapCanvasText(context, currentPage.detail, 530)
      .slice(0, 5)
      .forEach((line, index) => context.fillText(line, 780, 330 + index * 36, 530));

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

  private wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  private createCoverTexture(): CanvasTexture {
    const canvas = this.canvasRef.nativeElement.ownerDocument.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1000;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear la portada del libro');

    const gradient = context.createLinearGradient(0, 0, 720, 1000);
    gradient.addColorStop(0, '#245e9b');
    gradient.addColorStop(1, '#102d52');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#c7aa71';
    context.lineWidth = 5;
    context.strokeRect(36, 36, 648, 928);

    context.fillStyle = '#dec890';
    context.textAlign = 'center';
    context.font = '600 28px Georgia, serif';
    const story = this.storyData();
    if (!story) throw new Error('No hay datos cargados para la portada');
    context.fillText(story.edition, 360, 260, 620);
    context.fillStyle = '#fffaf0';
    context.font = '700 62px Georgia, serif';
    context.fillText(story.book.coverTitle, 360, 455, 620);
    context.fillStyle = '#dec890';
    context.font = 'italic 26px Georgia, serif';
    context.fillText(story.book.coverSubtitle, 360, 610, 620);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }

  private updateScene(elapsed: number): void {
    if (
      !this.camera ||
      !this.book ||
      !this.bookCoverHinge ||
      !this.bookPages ||
      !this.bookRearCover ||
      !this.bookEdge ||
      !this.pageSurface
    )
      return;
    const progress = this.ease(this.segment(elapsed, 0, this.duration));
    const mobile = this.camera.aspect < 0.8;
    const menuWidth = Math.min(440, Math.max(350, window.innerWidth * 0.3));
    const bookWidthRatio = mobile ? 0.91 : 0.9 * (1 - menuWidth / window.innerWidth);
    const distance = 8.3 / (2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.aspect * bookWidthRatio);
    const targetX = mobile ? -2.2 : -0.25;

    this.camera.position.set(targetX, 0, MathUtils.lerp(distance * 1.35, distance, progress));
    this.camera.lookAt(targetX, 0, 0);
    this.book.visible = true;
    this.book.position.z = MathUtils.lerp(-1.8, 0, progress);
    this.book.scale.setScalar(MathUtils.lerp(0.84, 1.08, progress));
    const openProgress = this.ease(this.segment(elapsed, 2.4, 6.9));
    const leaves: [Mesh, number][] = [
      [this.bookPages, 1.925],
      [this.bookRearCover, 1.9875],
      [this.bookEdge, 1.95],
      [this.pageSurface, 1.8375],
    ];
    for (const [leaf, startX] of leaves) {
      leaf.scale.x = MathUtils.lerp(0.5, 1, openProgress);
      leaf.position.x = MathUtils.lerp(startX, 0, openProgress);
    }
    const pageTexture = (this.pageSurface.material as MeshStandardMaterial).map;
    if (pageTexture) {
      pageTexture.repeat.x = MathUtils.lerp(0.5, 1, openProgress);
      pageTexture.offset.x = MathUtils.lerp(0.5, 0, openProgress);
    }
    this.bookCoverHinge.rotation.y = Math.PI * openProgress;
  }

  private segment(value: number, start: number, end: number): number {
    return MathUtils.clamp((value - start) / (end - start), 0, 1);
  }

  private ease(value: number): number {
    return value * value * value * (value * (value * 6 - 15) + 10);
  }

  private resizeRenderer(): void {
    const renderer = this.renderer;
    const camera = this.camera;
    if (!renderer || !camera || this.destroyed) return;
    const { width, height } = this.stageRef.nativeElement.getBoundingClientRect();
    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    this.updateScene(this.isPlaying() ? (performance.now() - this.animationStart) / 1000 : this.duration);
    renderer.setSize(width, height, false);
    renderer.render(this.scene!, camera);
  }

  private finishAnimation(): void {
    this.isPlaying.set(false);
    this.showIndex.set(true);
    this.renderer?.render(this.scene!, this.camera!);
  }
}
