import * as THREE from "three";
import { TerrainRaycaster } from "./terrainRaycaster";

/**
 * Three.js Raycaster 기반 부드러운 캐릭터 컨트롤러
 * 통통 튀는 문제를 해결하고 지형에 자연스럽게 적응합니다.
 */

export interface SmoothCharacterController {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isOnGround: boolean;
  mesh: THREE.Mesh;
  update(keys: any, deltaTime: number): void;
  setPosition(x: number, y: number, z: number): void;
  getPosition(): THREE.Vector3;
  destroy(): void;
}

export class TerrainAdaptiveCharacterController implements SmoothCharacterController {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public isOnGround: boolean = true;
  public mesh: THREE.Mesh;

  private terrainRaycaster: TerrainRaycaster;
  private scene: THREE.Scene;

  // 이동 설정 - 더 빠르고 반응적으로
  private moveSpeed: number = 50; // 적당한 속도
  private jumpPower: number = 70; // 점프력 더욱 증가 (지형 올라가기 가능)
  private gravity: number = 45; // 중력 약간 줄여서 더 높이 올라갈 수 있게

  // 지형 적응 설정 - 더 관대하게
  private groundCheckDistance: number = 4.0; // 지면 감지 거리 더 증가
  private maxStepHeight: number = 6.0; // 계단 높이 대폭 증가
  private stairDetectionRadius: number = 2.5; // 계단 감지 반경 확장

  // 스무딩 설정 - 더 빠른 반응
  private velocityDamping: number = 0.9; // 더 부드러운 감쇠
  private groundSnapDistance: number = 1.5; // 지면 스냅 거리 더 증가
  private landingSpeedThreshold: number = 3.0; // 착지 속도 임계값 완화

  // 상태 추적
  private lastGroundHeight: number = 150;
  private groundContactTime: number = 0;
  private airTime: number = 0;

  constructor(scene: THREE.Scene, terrainRaycaster: TerrainRaycaster, startPosition: THREE.Vector3) {
    this.scene = scene;
    this.terrainRaycaster = terrainRaycaster;
    this.position = startPosition.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);

    // 시각적 메시 생성 (디버깅용, 투명하게)
    const geometry = new THREE.CapsuleGeometry(0.8, 2.0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.0, // 완전히 투명
      visible: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = false;
    this.mesh.visible = false;

    scene.add(this.mesh);

    // 초기 지형 높이 설정
    this.lastGroundHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
    this.position.y = this.lastGroundHeight;

    console.log(`부드러운 캐릭터 컨트롤러 생성: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
  }

  public update(keys: any, deltaTime: number): void {
    // deltaTime 안정화
    deltaTime = Math.min(Math.max(deltaTime, 1 / 120), 1 / 30);

    // 1. 수평 이동 처리
    this.handleHorizontalMovement(keys, deltaTime);

    // 2. 지형 분석 및 적응
    this.adaptToTerrain(deltaTime);

    // 3. 수직 이동 처리 (중력, 점프)
    this.handleVerticalMovement(keys, deltaTime);

    // 4. 최종 위치 업데이트
    this.updateFinalPosition(deltaTime);

    // 5. 메시 위치 동기화
    this.mesh.position.copy(this.position);
  }

  private handleHorizontalMovement(keys: any, deltaTime: number): void {
    const moveVector = new THREE.Vector3(0, 0, 0);

    // 키 입력 처리
    if (keys["KeyW"] || keys["ArrowUp"]) moveVector.z = -1;
    if (keys["KeyS"] || keys["ArrowDown"]) moveVector.z = 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) moveVector.x = -1;
    if (keys["KeyD"] || keys["ArrowRight"]) moveVector.x = 1;

    // 대각선 이동 정규화
    if (moveVector.length() > 0) {
      moveVector.normalize();

      // 이동하려는 위치에서 빠른 지형 분석 (버벅임 방지)
      const futureX = this.position.x + moveVector.x * this.moveSpeed * deltaTime;
      const futureZ = this.position.z + moveVector.z * this.moveSpeed * deltaTime;

      // 간단한 벽 충돌 검사 - 성능 최적화
      const currentHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
      const futureHeight = this.terrainRaycaster.getTerrainHeight(futureX, futureZ);
      const basicHeightDiff = futureHeight - currentHeight;

      // 개선된 벽 감지 - 점프 중일 때는 더 관대하게
      const heightThreshold = this.isOnGround ? this.maxStepHeight : this.maxStepHeight * 2;
      if (basicHeightDiff > heightThreshold) {
        // 점프 중이 아니거나 너무 높으면 이동 불가
        if (this.isOnGround) {
          this.velocity.x *= 0.1;
          this.velocity.z *= 0.1;
          return;
        }
      }

      // 개선된 계단 감지 및 처리
      if (basicHeightDiff > 0.1 && basicHeightDiff <= this.maxStepHeight) {
        // 계단 처리 - 더 정확한 감지
        if (this.isValidStair(futureX, futureZ, basicHeightDiff) || this.isOnGround) {
          // 지면에 있을 때 계단 등반 또는 점프 중 착지
          this.position.y += basicHeightDiff; // 즉시 올라감
          console.log(`계단 등반: 높이 ${basicHeightDiff.toFixed(1)}`);
        } else if (this.isOnGround) {
          // 지면에서 계단이 아니면 벽으로 처리
          this.velocity.x *= 0.3; // 완전히 막지 않고 속도만 줄임
          this.velocity.z *= 0.3;
          console.log(`경사면: 높이 ${basicHeightDiff.toFixed(1)}`);
        }
      }

      // 개선된 경사 하강 처리 - 다리 아래 통과 허용
      if (basicHeightDiff < -this.maxStepHeight) {
        // 하강이지만 점프 중이거나 다리 아래 통과하는 경우 허용
        if (!this.isOnGround || this.velocity.y > 0) {
          // 공중에 있거나 상승 중이면 자유롭게 이동
          console.log(`공중 이동 허용: 하강 ${Math.abs(basicHeightDiff).toFixed(1)}`);
        } else {
          // 지면에서 급격한 하강은 속도 제한
          this.velocity.x *= 0.7; // 덜 제한적으로
          this.velocity.z *= 0.7;
          console.log(`급경사 하강: ${Math.abs(basicHeightDiff).toFixed(1)}`);
        }
      }

      // 수평 속도 직접 적용 (버벅임 방지)
      this.velocity.x = moveVector.x * this.moveSpeed;
      this.velocity.z = moveVector.z * this.moveSpeed;
    } else {
      // 이동하지 않을 때 빠른 감쇠
      this.velocity.x *= this.velocityDamping;
      this.velocity.z *= this.velocityDamping;
    }
  }

  private adaptToTerrain(deltaTime: number): void {
    // 현재 위치에서 지형 높이 감지
    const currentGroundHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);

    // 지면과의 거리 계산
    const distanceToGround = this.position.y - currentGroundHeight;

    // 개선된 지면 접촉 상태 판단 - 점프 중에도 지형 근처에서 착지 감지
    const wasOnGround = this.isOnGround;
    this.isOnGround =
      distanceToGround <= this.groundCheckDistance && (Math.abs(this.velocity.y) < this.landingSpeedThreshold || this.velocity.y <= 10); // 상승 중에도 지면 근처면 착지 준비

    if (this.isOnGround) {
      this.groundContactTime += deltaTime;
      this.airTime = 0;

      // 지면에 있을 때 즉시 지형에 맞춤 (빠른 착지)
      if (distanceToGround < this.groundSnapDistance || (this.velocity.y < 0 && distanceToGround < this.groundSnapDistance * 2)) {
        // 즉시 지면에 스냅
        this.position.y = currentGroundHeight;
        this.lastGroundHeight = currentGroundHeight;

        // 지면에 착지했을 때 Y축 속도 즉시 제거
        if (this.velocity.y < 0) {
          this.velocity.y = 0;
        }
      }
    } else {
      this.airTime += deltaTime;
      this.groundContactTime = 0;
    }

    // 착지 감지
    if (!wasOnGround && this.isOnGround) {
      console.log(`착지! 높이: ${this.position.y.toFixed(1)}`);
    }
  }

  private handleVerticalMovement(keys: any, deltaTime: number): void {
    // 개선된 점프 처리 - 더 관대한 조건
    if (keys["Space"] && this.isOnGround && this.groundContactTime > 0.05) {
      this.velocity.y = this.jumpPower;
      this.isOnGround = false;
      this.groundContactTime = 0;
      console.log(`점프! 현재 높이: ${this.position.y.toFixed(1)}, 점프력: ${this.jumpPower}`);
    }

    // 공중에 있을 때 중력 적용 - 조정된 중력
    if (!this.isOnGround) {
      this.velocity.y -= this.gravity * deltaTime;

      // 최대 낙하 속도 제한 (적당한 착지 속도)
      this.velocity.y = Math.max(this.velocity.y, -70);
    } else {
      // 지면에 있을 때 Y속도 완전히 제거
      this.velocity.y = Math.max(this.velocity.y, 0); // 하강 속도만 제거, 상승은 유지
    }
  }

  private updateFinalPosition(deltaTime: number): void {
    // 새로운 위치 계산
    const newPosition = this.position.clone();
    newPosition.add(this.velocity.clone().multiplyScalar(deltaTime));

    // 수평 이동 간단 검증 (성능 최적화)
    if (this.velocity.x !== 0 || this.velocity.z !== 0) {
      // 바로 위치 적용 (버벅임 방지)
      this.position.x = newPosition.x;
      this.position.z = newPosition.z;
    }

    // 수직 이동 적용
    this.position.y = newPosition.y;

    // 개선된 지형 관통 방지 - 점프로 지형 올라가기 허용
    const minHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
    const heightDifference = this.position.y - minHeight;

    // 지형 관통만 방지하고, 점프 중일 때는 더 관대하게
    if (heightDifference < -2.0) {
      // 지형 2 단위 아래로 떨어질 때만 수정 (더 관대하게)
      // 상승 중이 아니라면 지형에 맞춤
      if (this.velocity.y <= 0) {
        this.position.y = minHeight;
        this.velocity.y = 0;
        this.isOnGround = true;
        console.log(`지형 관통 방지: 높이 ${minHeight.toFixed(1)}로 수정`);
      }
    } else if (heightDifference < 0 && this.velocity.y > 0) {
      // 점프 중이고 약간 지형 아래에 있으면 점프력으로 올라가기 허용
      console.log(`점프로 지형 통과 중: 높이차 ${heightDifference.toFixed(1)}`);
    }

    // 경계 검사 (옵션)
    this.checkBounds();
  }

  private checkBounds(): void {
    // 맵 경계 설정 (옵션)
    const bounds = {
      minX: -100,
      maxX: 240,
      minZ: -50,
      maxZ: 250,
    };

    this.position.x = THREE.MathUtils.clamp(this.position.x, bounds.minX, bounds.maxX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, bounds.minZ, bounds.maxZ);
  }

  /**
   * 계단인지 벽인지 정확하게 판단 - 개선된 버전
   */
  private isValidStair(x: number, z: number, heightDiff: number): boolean {
    // 높이 차이가 작으면 무조건 계단으로 인정
    if (heightDiff <= 2.0) {
      return true;
    }

    // 계단 주변 더 많은 지점에서 검사 (더 넓은 범위)
    const checkPoints = [
      { x: x, z: z }, // 중앙
      { x: x + this.stairDetectionRadius, z: z }, // 오른쪽
      { x: x - this.stairDetectionRadius, z: z }, // 왼쪽
      { x: x, z: z + this.stairDetectionRadius }, // 앞
      { x: x, z: z - this.stairDetectionRadius }, // 뒤
      // 대각선 방향 추가
      { x: x + this.stairDetectionRadius * 0.7, z: z + this.stairDetectionRadius * 0.7 },
      { x: x - this.stairDetectionRadius * 0.7, z: z - this.stairDetectionRadius * 0.7 },
      { x: x + this.stairDetectionRadius * 0.7, z: z - this.stairDetectionRadius * 0.7 },
      { x: x - this.stairDetectionRadius * 0.7, z: z + this.stairDetectionRadius * 0.7 },
    ];

    let validStairCount = 0;
    const currentHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);

    for (const point of checkPoints) {
      const pointHeight = this.terrainRaycaster.getTerrainHeight(point.x, point.z);
      const pointHeightDiff = pointHeight - currentHeight;

      // 비슷한 높이의 지형이 여러 개 있으면 계단 (더 관대한 임계값)
      if (Math.abs(pointHeightDiff - heightDiff) < 2.0) {
        validStairCount++;
      }
    }

    // 전체 검사 지점의 30% 이상이 비슷한 높이면 계단 (더 관대함)
    const stairThreshold = checkPoints.length * 0.3;
    return validStairCount >= stairThreshold;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.lastGroundHeight = this.terrainRaycaster.getTerrainHeight(x, z);
    this.mesh.position.copy(this.position);
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public destroy(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((mat) => mat.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }
  }

  // 디버깅 메서드
  public getDebugInfo(): any {
    return {
      position: {
        x: this.position.x.toFixed(2),
        y: this.position.y.toFixed(2),
        z: this.position.z.toFixed(2),
      },
      velocity: {
        x: this.velocity.x.toFixed(2),
        y: this.velocity.y.toFixed(2),
        z: this.velocity.z.toFixed(2),
      },
      isOnGround: this.isOnGround,
      groundContactTime: this.groundContactTime.toFixed(2),
      airTime: this.airTime.toFixed(2),
      lastGroundHeight: this.lastGroundHeight.toFixed(2),
    };
  }

  /**
   * 디버깅용 지형 정보 출력
   */
  public debugTerrainInfo(): void {
    this.terrainRaycaster.debugTerrainMeshes();
    const currentPos = this.getPosition();
    this.terrainRaycaster.testRaycastAtPosition(currentPos.x, currentPos.z);
  }
}
