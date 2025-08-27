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

  // 이동 설정
  private moveSpeed: number = 15;
  private jumpPower: number = 8;
  private gravity: number = 20;

  // 지형 적응 설정
  private groundCheckDistance: number = 2.0;
  private maxStepHeight: number = 1.5;
  private slopeLimit: number = 8; // 최대 경사각도

  // 스무딩 설정
  private positionSmoothing: number = 0.85; // 위치 스무딩 강도
  private velocityDamping: number = 0.9; // 속도 감쇠
  private groundSnapDistance: number = 0.5; // 지면 스냅 거리

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

      // 이동하려는 위치에서 지형 분석
      const futureX = this.position.x + moveVector.x * this.moveSpeed * deltaTime;
      const futureZ = this.position.z + moveVector.z * this.moveSpeed * deltaTime;

      const terrainAnalysis = this.terrainRaycaster.analyzeTerrainAroundPosition(futureX, futureZ, 2);

      // 경사가 너무 가파르면 이동 제한
      if (!terrainAnalysis.canMove) {
        console.log(`이동 제한: 경사 ${terrainAnalysis.slope.toFixed(1)}° > ${this.slopeLimit}°`);
        return;
      }

      // 경사에 따른 속도 조절
      let speedMultiplier = 1.0;
      if (terrainAnalysis.slope > 3) {
        speedMultiplier = Math.max(0.4, 1 - terrainAnalysis.slope / 15);
      }

      // 수평 속도 적용
      this.velocity.x = moveVector.x * this.moveSpeed * speedMultiplier;
      this.velocity.z = moveVector.z * this.moveSpeed * speedMultiplier;
    } else {
      // 이동하지 않을 때 수평 속도 감쇠
      this.velocity.x *= this.velocityDamping;
      this.velocity.z *= this.velocityDamping;
    }
  }

  private adaptToTerrain(deltaTime: number): void {
    // 현재 위치에서 지형 높이 감지
    const currentGroundHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
    const terrainAnalysis = this.terrainRaycaster.analyzeTerrainAroundPosition(this.position.x, this.position.z, 1.5);

    // 지면과의 거리 계산
    const distanceToGround = this.position.y - currentGroundHeight;

    // 지면 접촉 상태 판단
    const wasOnGround = this.isOnGround;
    this.isOnGround = distanceToGround <= this.groundCheckDistance && Math.abs(this.velocity.y) < 5;

    if (this.isOnGround) {
      this.groundContactTime += deltaTime;
      this.airTime = 0;

      // 지면에 있을 때 자연스럽게 지형에 맞춤
      if (distanceToGround < this.groundSnapDistance) {
        // 부드러운 지면 스냅
        const targetY = currentGroundHeight;
        const heightDiff = Math.abs(targetY - this.lastGroundHeight);

        if (heightDiff < this.maxStepHeight) {
          // 작은 높이 변화는 즉시 적용
          this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, this.positionSmoothing);
        } else {
          // 큰 높이 변화는 점진적으로 적용
          const smoothingRate = this.positionSmoothing * 0.3;
          this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, smoothingRate);
        }

        this.lastGroundHeight = currentGroundHeight;

        // 지면에 착지했을 때 Y축 속도 제거
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
    // 점프 처리
    if (keys["Space"] && this.isOnGround && this.groundContactTime > 0.1) {
      this.velocity.y = this.jumpPower;
      this.isOnGround = false;
      this.groundContactTime = 0;
      console.log(`점프! 현재 높이: ${this.position.y.toFixed(1)}`);
    }

    // 공중에 있을 때 중력 적용
    if (!this.isOnGround) {
      this.velocity.y -= this.gravity * deltaTime;

      // 최대 낙하 속도 제한
      this.velocity.y = Math.max(this.velocity.y, -30);
    }
  }

  private updateFinalPosition(deltaTime: number): void {
    // 새로운 위치 계산
    const newPosition = this.position.clone();
    newPosition.add(this.velocity.clone().multiplyScalar(deltaTime));

    // 수평 이동 검증
    if (this.velocity.x !== 0 || this.velocity.z !== 0) {
      const terrainAnalysis = this.terrainRaycaster.analyzeTerrainAroundPosition(newPosition.x, newPosition.z, 1);

      if (terrainAnalysis.isOnValidTerrain) {
        this.position.x = newPosition.x;
        this.position.z = newPosition.z;
      } else {
        // 유효하지 않은 지형으로 이동하려 할 때 수평 속도 제거
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    // 수직 이동 적용
    this.position.y = newPosition.y;

    // 지형 아래로 떨어지지 않도록 방지
    const minHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
    if (this.position.y < minHeight) {
      this.position.y = minHeight;
      this.velocity.y = Math.max(0, this.velocity.y);
      this.isOnGround = true;
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
}
