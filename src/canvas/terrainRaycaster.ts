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
    const collectionRadius = 500; // 등대까지 포함하도록 대폭 확장

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const worldPosition = new THREE.Vector3();
        child.getWorldPosition(worldPosition);

        // 숲 근처의 메시만 선택
        if (worldPosition.distanceTo(forestCenter) < collectionRadius) {
          // 지형 특성을 가진 메시 필터링
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
    // 1. 이름 기반 필터링
    const name = mesh.name.toLowerCase();
    const terrainKeywords = [
      "ground",
      "floor",
      "terrain",
      "base",
      "forest",
      "land",
      "plane",
      "mesh",
      "step",
      "stair",
      "platform",
      "bridge",
      "path",
      "road",
      "wall",
      "rock",
      "stone",
      "block",
      "cube",
      "box",
      "surface",
      "level",
      "stage",
      "lighthouse",
    ];

    // 나무 및 장식용 오브젝트 처리 - 투명하게 만들고 밟을 수 있게
    const decorativeKeywords = [
      "tree",
      "leaf",
      "branch",
      "trunk",
      "bark",
      "foliage",
      "canopy",
      "flower",
      "bush",
      "plant",
      "vegetation",
      "root",
      "stem",
      "pine",
      "oak",
      "shrub",
      "fern",
      "moss",
      "ivy",
      "wood",
      "log",
      "twig",
    ];

    const isDecorative = decorativeKeywords.some((keyword) => name.includes(keyword));
    if (isDecorative) {
      // 나무/수풀 오브젝트를 완전히 투명하게 만들고 충돌 비활성화
      this.makeObjectPassable(mesh);
      return false; // 지형에서는 제외하여 통과 가능
    }
    const isNameMatch = terrainKeywords.some((keyword) => name.includes(keyword));

    // 2. 크기 기반 필터링
    mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return false;

    const size = new THREE.Vector3();
    mesh.geometry.boundingBox.getSize(size);

    // 지형다운 크기 (가로세로가 어느 정도 있고, 너무 얇지 않은)
    const hasReasonableSize = size.x > 0.3 && size.z > 0.3 && size.y > 0.05; // 기준 완화
    const isFlattish = (size.x * size.z) / Math.max(size.y, 0.1) > 0.5; // 더 관대한 기준

    // 3. 위치 기반 필터링 (너무 높지 않은 곳에 있는)
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    const isReasonableHeight = worldPosition.y > -100 && worldPosition.y < 300; // 범위 확장

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

    // 단순한 샘플 레이캐스팅 - 성능 최적화
    const heights: number[] = [];
    const sampleOffsets = [
      { x: 0, z: 0 }, // 중앙
      { x: 0.4, z: 0 }, // 오른쪽
      { x: -0.4, z: 0 }, // 왼쪽
      { x: 0, z: 0.4 }, // 앞
      { x: 0, z: -0.4 }, // 뒤
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
      const distanceToForest = Math.sqrt((x - 70) ** 2 + (z - 100) ** 2);
      // 위치별 기본 높이 설정
      if (distanceToForest < 100) {
        return 150; // 숲 중심부
      } else if (distanceToForest < 200) {
        return 120; // 숲 주변부
      } else if (distanceToForest < 300) {
        return 80; // 외곽 지역
      } else {
        return 50; // 먼 지역
      }
    }

    // 평균 높이 계산 (이상값 제거)
    const filteredHeights = heights.filter((h) => h > -100 && h < 500);
    if (filteredHeights.length === 0) {
      return 150;
    }

    const averageHeight = filteredHeights.reduce((sum, h) => sum + h, 0) / filteredHeights.length;

    // 간단한 스무딩 - 성능 최적화
    if (useSmoothing && this.smoothingEnabled) {
      const lastHeight = this.lastHeightMap.get(positionKey);
      if (lastHeight !== undefined) {
        const heightDiff = Math.abs(averageHeight - lastHeight);

        if (heightDiff > this.heightChangeThreshold) {
          // 단순한 스무딩
          const smoothingFactor = 0.5;
          const smoothedHeight = lastHeight + (averageHeight - lastHeight) * smoothingFactor;
          this.lastHeightMap.set(positionKey, smoothedHeight);
          return smoothedHeight + 1.0;
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
    hasStairs: boolean;
    wallHeight: number;
  } {
    const heights: number[] = [];
    const gridSize = 7; // 7x7 그리드로 더 세밀한 감지
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
        hasStairs: false,
        wallHeight: 0,
      };
    }

    const currentHeight = this.getTerrainHeight(x, z, false);
    const averageHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const slope = maxHeight - minHeight;
    const wallHeight = maxHeight - currentHeight;

    // 계단 감지 - 점진적인 높이 증가
    const hasStairs = this.detectStairs(heights);

    // 이동 가능 여부 판단 - 계단이 있으면 더 관대하게
    let canMove = slope < 12; // 기본 경사 제한 완화
    if (hasStairs) {
      canMove = slope < 20; // 계단이 있으면 더 가파른 경사도 허용
    }

    // 벽 감지 - 너무 높이 올라가면 이동 불가
    if (wallHeight > 3.0 && !hasStairs) {
      canMove = false;
    }

    const isOnValidTerrain = heights.length > gridSize * gridSize * 0.2; // 20%로 완화

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
   * 계단 감지 알고리즘
   */
  private detectStairs(heights: number[]): boolean {
    if (heights.length < 3) return false;

    // 높이를 정렬하여 점진적 증가 패턴 감지
    const sortedHeights = [...heights].sort((a, b) => a - b);

    let stepCount = 0;
    const stepThreshold = 0.5; // 계단 최소 높이
    const maxStepHeight = 2.0; // 계단 최대 높이

    for (let i = 1; i < sortedHeights.length; i++) {
      const heightDiff = sortedHeights[i] - sortedHeights[i - 1];
      if (heightDiff >= stepThreshold && heightDiff <= maxStepHeight) {
        stepCount++;
      }
    }

    // 전체 높이 데이터의 30% 이상이 계단 패턴이면 계단으로 인식
    return stepCount > heights.length * 0.3;
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

  /**
   * 나무/장식용 오브젝트를 완전히 통과 가능하게 만들기
   */
  private makeObjectPassable(mesh: THREE.Mesh): void {
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
            mat.transparent = true;
            mat.opacity = 0.1; // 거의 투명
            mat.needsUpdate = true;
          }
        });
      } else {
        const material = mesh.material as THREE.Material;
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
          material.transparent = true;
          material.opacity = 0.1; // 거의 투명
          material.needsUpdate = true;
        }
      }
    }

    // 물리적 충돌도 비활성화 - 렌더링만 유지
    mesh.visible = true; // 보이기는 하지만
    mesh.userData.passable = true; // 통과 가능 마킹

    console.log(`장식용 오브젝트 통과 가능 처리: ${mesh.name}`);
  }
}
