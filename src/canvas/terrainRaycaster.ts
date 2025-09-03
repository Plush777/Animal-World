import * as THREE from "three";

/**
 * Three.js Raycaster 기반 지형 높이 감지 시스템 (개선 버전)
 */
export class TerrainRaycaster {
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private terrainMeshes: THREE.Mesh[] = [];
  private smoothingEnabled: boolean = true;
  private lastHeightMap: Map<string, number[]> = new Map(); // 최근 높이 기록 (배열)
  private heightChangeThreshold: number = 5.0;
  private smoothingWindowSize: number = 5; // 이동평균 크기

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.collectTerrainMeshes();
  }

  /**
   * 씬에서 지형이 될 수 있는 메시들을 수집합니다.
   */
  private collectTerrainMeshes(): void {
    this.terrainMeshes = [];
    const forestCenter = new THREE.Vector3(70, 0, 100);
    const collectionRadius = 500;

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const worldPosition = new THREE.Vector3();
        child.getWorldPosition(worldPosition);

        if (worldPosition.distanceTo(forestCenter) < collectionRadius) {
          if (this.isTerrainMesh(child)) {
            this.terrainMeshes.push(child);
          }
        }
      }
    });

    console.log(`총 ${this.terrainMeshes.length}개의 지형 메시를 수집했습니다.`);
  }

  /**
   * 메시가 지형인지 판단합니다.
   */
  private isTerrainMesh(mesh: THREE.Mesh): boolean {
    const name = mesh.name.toLowerCase();
    const terrainKeywords = ["lighthouse", "ground", "terrain"];

    const isNameMatch = terrainKeywords.some((keyword) => name.includes(keyword));

    // 월드 좌표 기준 bounding box 계산
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const hasReasonableSize = size.x > 0.3 && size.z > 0.3 && size.y > 0.05;
    const isFlattish = (size.x * size.z) / Math.max(size.y, 0.1) > 0.5;

    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const isReasonableHeight = center.y > -100 && center.y < 300;

    return (isNameMatch || (hasReasonableSize && isFlattish)) && isReasonableHeight;
  }

  /**
   * 특정 위치에서 지형 높이를 감지합니다.
   */
  public getTerrainHeight(x: number, z: number, useSmoothing: boolean = true): number {
    const positionKey = `${x.toFixed(1)}_${z.toFixed(1)}`;

    const heights: number[] = [];
    const sampleOffsets = [
      { x: 0, z: 0 }, // 중앙
      { x: 0.4, z: 0 },
      { x: -0.4, z: 0 }, // 좌우
      { x: 0, z: 0.4 },
      { x: 0, z: -0.4 }, // 앞뒤
      { x: 0.4, z: 0.4 },
      { x: -0.4, z: 0.4 }, // 대각선
      { x: 0.4, z: -0.4 },
      { x: -0.4, z: -0.4 },
    ];

    sampleOffsets.forEach((offset) => {
      const rayOrigin = new THREE.Vector3(x + offset.x, 300, z + offset.z);
      const rayDirection = new THREE.Vector3(0, -1, 0);

      this.raycaster.set(rayOrigin, rayDirection);
      const intersects = this.raycaster.intersectObjects(this.terrainMeshes, false);

      if (intersects.length > 0) {
        heights.push(intersects[0].point.y);
      }
    });

    if (heights.length === 0) {
      return this.getFallbackHeight(x, z);
    }

    const filteredHeights = heights.filter((h) => h > -100 && h < 500);
    if (filteredHeights.length === 0) {
      return this.getFallbackHeight(x, z);
    }

    const averageHeight = filteredHeights.reduce((sum, h) => sum + h, 0) / filteredHeights.length;

    // 스무딩 적용
    if (useSmoothing && this.smoothingEnabled) {
      let history = this.lastHeightMap.get(positionKey) || [];
      history.push(averageHeight);
      if (history.length > this.smoothingWindowSize) {
        history.shift(); // 오래된 값 제거
      }
      this.lastHeightMap.set(positionKey, history);

      const smoothedHeight = history.reduce((sum, h) => sum + h, 0) / history.length;
      return smoothedHeight + 1.0;
    }

    return averageHeight + 1.0;
  }

  /**
   * fallback 높이 (레이캐스트 실패 시)
   */
  private getFallbackHeight(x: number, z: number): number {
    const distanceToForest = Math.sqrt((x - 70) ** 2 + (z - 100) ** 2);
    if (distanceToForest < 100) return 150;
    if (distanceToForest < 200) return 120;
    if (distanceToForest < 300) return 80;
    return 50;
  }

  /**
   * 캐릭터 주변 지형 분석
   */
  public analyzeTerrainAroundPosition(x: number, z: number, radius: number = 3) {
    const heights: number[] = [];
    const gridSize = 7;
    const step = radius / (gridSize - 1);

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const sampleX = x - radius / 2 + i * step;
        const sampleZ = z - radius / 2 + j * step;

        const rayOrigin = new THREE.Vector3(sampleX, 300, sampleZ);
        const rayDirection = new THREE.Vector3(0, -1, 0);

        this.raycaster.set(rayOrigin, rayDirection);
        const intersects = this.raycaster.intersectObjects(this.terrainMeshes, false);

        if (intersects.length > 0) {
          heights.push(intersects[0].point.y);
        }
      }
    }

    if (heights.length === 0) {
      return {
        currentHeight: 150,
        averageHeight: 150,
        slope: 0,
        canMove: true,
        isOnValidTerrain: false,
        hasStairs: false,
        wallHeight: 0,
      };
    }

    const currentHeight = this.getTerrainHeight(x, z, false);
    const averageHeight = heights.reduce((s, h) => s + h, 0) / heights.length;
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const slope = maxHeight - minHeight;
    const wallHeight = maxHeight - currentHeight;

    const hasStairs = this.detectStairs(heights);

    let canMove = slope < 12;
    if (hasStairs) canMove = slope < 20;
    if (wallHeight > 3.0 && !hasStairs) canMove = false;

    const isOnValidTerrain = heights.length > gridSize * gridSize * 0.2;

    return {
      currentHeight,
      averageHeight,
      slope,
      canMove,
      isOnValidTerrain,
      hasStairs,
      wallHeight,
    };
  }

  /**
   * 계단 감지
   */
  private detectStairs(heights: number[]): boolean {
    if (heights.length < 3) return false;
    const sortedHeights = [...heights].sort((a, b) => a - b);

    let stepCount = 0;
    const stepThreshold = 0.5;
    const maxStepHeight = 2.0;

    for (let i = 1; i < sortedHeights.length; i++) {
      const diff = sortedHeights[i] - sortedHeights[i - 1];
      if (diff >= stepThreshold && diff <= maxStepHeight) stepCount++;
    }

    return stepCount > heights.length * 0.3;
  }

  /**
   * 지형 메시 갱신
   */
  public updateTerrainMeshes(): void {
    this.collectTerrainMeshes();
  }

  public setSmoothing(enabled: boolean): void {
    this.smoothingEnabled = enabled;
  }

  public setHeightChangeThreshold(threshold: number): void {
    this.heightChangeThreshold = threshold;
  }

  /**
   * 디버깅
   */
  public debugTerrainMeshes(): void {
    console.log("=== 지형 메시 디버깅 ===");
    this.terrainMeshes.forEach((mesh, idx) => {
      const bbox = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      console.log(`${idx + 1}. ${mesh.name || "unnamed"}`);
      console.log(`   위치(센터): (${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)})`);
      console.log(`   크기: (${size.x.toFixed(1)}, ${size.y.toFixed(1)}, ${size.z.toFixed(1)})`);
    });
    console.log("=====================");
  }

  public testRaycastAtPosition(x: number, z: number): void {
    console.log(`=== 레이캐스팅 테스트 at (${x}, ${z}) ===`);

    const rayOrigin = new THREE.Vector3(x, 300, z);
    const rayDirection = new THREE.Vector3(0, -1, 0);

    this.raycaster.set(rayOrigin, rayDirection);
    const intersects = this.raycaster.intersectObjects(this.terrainMeshes, false);

    console.log(`레이캐스팅 결과: ${intersects.length}개 교차점`);
    intersects.forEach((hit, i) => {
      console.log(`${i + 1}. 오브젝트: ${hit.object.name || "unnamed"}`);
      console.log(`   교차점: (${hit.point.x.toFixed(2)}, ${hit.point.y.toFixed(2)}, ${hit.point.z.toFixed(2)})`);
      console.log(`   거리: ${hit.distance.toFixed(2)}`);
    });
    console.log("===============================");
  }
}
