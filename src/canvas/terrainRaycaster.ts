import * as THREE from "three";

/**
 * Three.js Raycaster 기반 지형 높이 감지 시스템
 * low_poly_game_forest.glb 모델의 실제 지형 메시를 정확히 감지합니다.
 */

export class TerrainRaycaster {
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private terrainMeshes: THREE.Mesh[] = [];
  private smoothingEnabled: boolean = true;
  private lastHeightMap: Map<string, number> = new Map();
  private heightChangeThreshold: number = 5.0; // 급격한 높이 변화 임계값

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
    const collectionRadius = 250; // 숲 중심에서 250 단위 반경

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const worldPosition = new THREE.Vector3();
        child.getWorldPosition(worldPosition);

        // 숲 근처의 메시만 선택
        if (worldPosition.distanceTo(forestCenter) < collectionRadius) {
          // 지형 특성을 가진 메시 필터링
          if (this.isTerrainMesh(child)) {
            this.terrainMeshes.push(child);
            console.log(
              `지형 메시 수집: ${child.name || "unnamed"} at (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(
                1
              )})`
            );
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
    // 1. 이름 기반 필터링
    const name = mesh.name.toLowerCase();
    const terrainKeywords = ["ground", "floor", "terrain", "base", "forest", "land", "plane", "island", "mesh"];
    const isNameMatch = terrainKeywords.some((keyword) => name.includes(keyword));

    // 2. 크기 기반 필터링
    mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return false;

    const size = new THREE.Vector3();
    mesh.geometry.boundingBox.getSize(size);

    // 지형다운 크기 (가로세로가 어느 정도 있고, 너무 얇지 않은)
    const hasReasonableSize = size.x > 0.5 && size.z > 0.5 && size.y > 0.1;
    const isFlattish = (size.x * size.z) / Math.max(size.y, 0.1) > 1; // 가로세로가 높이보다 큰 평평한 형태

    // 3. 위치 기반 필터링 (너무 높지 않은 곳에 있는)
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    const isReasonableHeight = worldPosition.y > -50 && worldPosition.y < 200;

    return (isNameMatch || (hasReasonableSize && isFlattish)) && isReasonableHeight;
  }

  /**
   * 특정 위치에서 지형 높이를 감지합니다.
   * @param x X 좌표
   * @param z Z 좌표
   * @param useSmoothing 스무딩 사용 여부
   * @returns 지형 높이
   */
  public getTerrainHeight(x: number, z: number, useSmoothing: boolean = true): number {
    const positionKey = `${x.toFixed(1)}_${z.toFixed(1)}`;

    // 다중 샘플 레이캐스팅
    const heights: number[] = [];
    const sampleOffsets = [
      { x: 0, z: 0 }, // 중앙
      { x: 0.5, z: 0 }, // 오른쪽
      { x: -0.5, z: 0 }, // 왼쪽
      { x: 0, z: 0.5 }, // 앞
      { x: 0, z: -0.5 }, // 뒤
    ];

    sampleOffsets.forEach((offset) => {
      const sampleX = x + offset.x;
      const sampleZ = z + offset.z;

      // 위에서 아래로 레이캐스팅
      const rayOrigin = new THREE.Vector3(sampleX, 300, sampleZ);
      const rayDirection = new THREE.Vector3(0, -1, 0);

      this.raycaster.set(rayOrigin, rayDirection);
      const intersects = this.raycaster.intersectObjects(this.terrainMeshes, false);

      if (intersects.length > 0) {
        // 가장 위쪽 지형의 높이를 사용
        heights.push(intersects[0].point.y);
      }
    });

    if (heights.length === 0) {
      // 기본 높이 반환
      const forestCenter = new THREE.Vector3(70, 0, 100);
      const distanceToForest = Math.sqrt((x - 70) ** 2 + (z - 100) ** 2);
      return distanceToForest < 150 ? 150 : 5; // 숲 근처면 150, 아니면 5
    }

    // 평균 높이 계산
    const averageHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;

    // 스무딩 적용
    if (useSmoothing && this.smoothingEnabled) {
      const lastHeight = this.lastHeightMap.get(positionKey);
      if (lastHeight !== undefined) {
        const heightDiff = Math.abs(averageHeight - lastHeight);

        if (heightDiff > this.heightChangeThreshold) {
          // 급격한 변화를 스무딩
          const smoothingFactor = 0.3;
          const smoothedHeight = lastHeight + (averageHeight - lastHeight) * smoothingFactor;
          this.lastHeightMap.set(positionKey, smoothedHeight);
          return smoothedHeight + 1.0; // 지면에서 1 단위 위
        }
      }

      this.lastHeightMap.set(positionKey, averageHeight);
    }

    return averageHeight + 1.0; // 지면에서 1 단위 위
  }

  /**
   * 캐릭터 주변의 지형을 분석합니다.
   */
  public analyzeTerrainAroundPosition(
    x: number,
    z: number,
    radius: number = 3
  ): {
    currentHeight: number;
    averageHeight: number;
    slope: number;
    canMove: boolean;
    isOnValidTerrain: boolean;
  } {
    const heights: number[] = [];
    const gridSize = 5; // 5x5 그리드
    const step = radius / (gridSize - 1);

    // 그리드 패턴으로 지형 샘플링
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
      };
    }

    const currentHeight = this.getTerrainHeight(x, z, false);
    const averageHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const slope = maxHeight - minHeight;

    // 이동 가능 여부 판단
    const canMove = slope < 8; // 8 단위 이하의 경사만 이동 가능
    const isOnValidTerrain = heights.length > gridSize * gridSize * 0.3; // 30% 이상 지형 감지

    return {
      currentHeight,
      averageHeight,
      slope,
      canMove,
      isOnValidTerrain,
    };
  }

  /**
   * 지형 메시 컬렉션을 갱신합니다.
   */
  public updateTerrainMeshes(): void {
    this.collectTerrainMeshes();
  }

  /**
   * 스무딩 기능을 설정합니다.
   */
  public setSmoothing(enabled: boolean): void {
    this.smoothingEnabled = enabled;
  }

  /**
   * 높이 변화 임계값을 설정합니다.
   */
  public setHeightChangeThreshold(threshold: number): void {
    this.heightChangeThreshold = threshold;
  }

  /**
   * 디버깅: 수집된 지형 메시 정보를 출력합니다.
   */
  public debugTerrainMeshes(): void {
    console.log("=== 지형 메시 디버깅 ===");
    this.terrainMeshes.forEach((mesh, index) => {
      const worldPosition = new THREE.Vector3();
      mesh.getWorldPosition(worldPosition);

      mesh.geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      if (mesh.geometry.boundingBox) {
        mesh.geometry.boundingBox.getSize(size);
      }

      console.log(`${index + 1}. ${mesh.name || "unnamed"}`);
      console.log(`   위치: (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})`);
      console.log(`   크기: (${size.x.toFixed(1)}, ${size.y.toFixed(1)}, ${size.z.toFixed(1)})`);
    });
    console.log("=====================");
  }

  /**
   * 특정 위치에서 레이캐스팅 테스트를 수행합니다.
   */
  public testRaycastAtPosition(x: number, z: number): void {
    console.log(`=== 레이캐스팅 테스트 at (${x}, ${z}) ===`);

    const rayOrigin = new THREE.Vector3(x, 300, z);
    const rayDirection = new THREE.Vector3(0, -1, 0);

    this.raycaster.set(rayOrigin, rayDirection);
    const intersects = this.raycaster.intersectObjects(this.terrainMeshes, false);

    console.log(`레이캐스팅 결과: ${intersects.length}개 교차점`);

    intersects.forEach((intersect, index) => {
      console.log(`${index + 1}. 오브젝트: ${intersect.object.name || "unnamed"}`);
      console.log(`   교차점: (${intersect.point.x.toFixed(2)}, ${intersect.point.y.toFixed(2)}, ${intersect.point.z.toFixed(2)})`);
      console.log(`   거리: ${intersect.distance.toFixed(2)}`);
    });

    console.log("===============================");
  }
}
