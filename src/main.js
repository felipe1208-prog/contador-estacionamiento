import * as THREE from "three";
import { CircuitLogicCore } from "./logic.js";
import { AudioManager } from "./audio.js";
import { ParkingScene } from "./scene.js";
import { VehicleManager } from "./vehicles.js";

class ApplicationController {
  constructor() {
    this.canvas = document.getElementById("webgl-canvas");

    // Módulos centrales
    this.logic = new CircuitLogicCore();
    this.audio = new AudioManager();
    this.scene = new ParkingScene(this.canvas);
    this.vehicles = new VehicleManager(this.scene.scene, this.scene);

    this.prevCount = 0;
    this.clock = new THREE.Clock();

    this.cacheDOM();
    this.bindEvents();
    this.updateHUD();

    // Inicializar tótem 3D en la escena
    this.scene.updateDisplayTotem(0, false);

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  cacheDOM() {
    // Alternancia de interfaz en móvil
    this.btnToggleUI = document.getElementById("btn-toggle-ui");
    this.uiOverlay = document.getElementById("ui-overlay");
    this.toggleUIText = document.getElementById("toggle-ui-text");

    // Botones de acción rápida
    this.btnQuickIn = document.getElementById("btn-quick-in");
    this.btnQuickOut = document.getElementById("btn-quick-out");

    // Sensores manuales
    this.btnEin = document.getElementById("btn-ein");
    this.btnEout = document.getElementById("btn-eout");
    this.btnClk = document.getElementById("btn-clk");

    // Desplegables
    this.manualHeader = document.getElementById("manual-toggle-btn");
    this.manualSection = this.manualHeader.closest(".manual-section");
    this.techToggleBtn = document.getElementById("tech-toggle-btn");
    this.techSection = this.techToggleBtn.closest(".tech-section");

    // Telemetría simple
    this.uiOccupancy = document.getElementById("occupancy-counter");
    this.uiAvailable = document.getElementById("available-counter");
    this.uiProgress = document.getElementById("occupancy-progress");
    this.uiGateIn = document.getElementById("gate-in-status");
    this.uiGateOut = document.getElementById("gate-out-status");

    // Alarma
    this.uiAlarmBanner = document.getElementById("alarm-banner");
    this.uiAlarmText = document.getElementById("alarm-text");

    // Telemetría técnica
    this.uiQ2 = document.getElementById("ff-q2");
    this.uiQ1 = document.getElementById("ff-q1");
    this.uiQ0 = document.getElementById("ff-q0");
    this.uiTermsQ2 = document.getElementById("terms-q2");
    this.uiTermsQ1 = document.getElementById("terms-q1");
    this.uiTermsQ0 = document.getElementById("terms-q0");
    this.uiLatchStatus = document.getElementById("latch-status");
    this.uiLatchS = document.getElementById("latch-s");
    this.uiLatchR = document.getElementById("latch-r");

    // Display de 7 segmentos 2D
    this.segElements = {
      a: document.getElementById("seg-a"),
      b: document.getElementById("seg-b"),
      c: document.getElementById("seg-c"),
      d: document.getElementById("seg-d"),
      e: document.getElementById("seg-e"),
      f: document.getElementById("seg-f"),
      g: document.getElementById("seg-g"),
    };

    this.camButtons = document.querySelectorAll(".cam-btn");
  }

  bindEvents() {
    // Alternancia de HUD en dispositivos móviles
    if (this.btnToggleUI && this.uiOverlay) {
      this.btnToggleUI.addEventListener("click", () => {
        const isCollapsed = this.uiOverlay.classList.toggle("ui-collapsed");
        if (this.toggleUIText) {
          this.toggleUIText.textContent = isCollapsed ? "Mostrar" : "Ocultar";
        }
      });
    }

    // ACCIÓN RÁPIDA 1: SUMAR CARRO (ENTRAR)
    this.btnQuickIn.addEventListener("click", () => {
      this.logic.setInputs(1, 0); // Ein=1, Eout=0
      this.audio.playRelayClick();
      const result = this.logic.triggerClockEdge();
      this.handleSequentialStep(result);
      this.syncManualSwitchState();
      this.updateHUD();
    });

    // ACCIÓN RÁPIDA 2: RESTAR CARRO (SALIR)
    this.btnQuickOut.addEventListener("click", () => {
      this.logic.setInputs(0, 1); // Ein=0, Eout=1
      this.audio.playRelayClick();
      const result = this.logic.triggerClockEdge();
      this.handleSequentialStep(result);
      this.syncManualSwitchState();
      this.updateHUD();
    });

    // Desplegables de la interfaz
    this.manualHeader.addEventListener("click", () => {
      this.manualSection.classList.toggle("open");
    });

    this.techToggleBtn.addEventListener("click", () => {
      this.techSection.classList.toggle("open");
    });

    // Controles de sensores manuales
    this.btnEin.addEventListener("click", () => {
      const active = this.btnEin.getAttribute("data-active") === "true";
      const next = !active;
      this.btnEin.setAttribute("data-active", String(next));
      this.btnEin.querySelector(".btn-val").textContent = next ? "1" : "0";
      this.syncInputs();
    });

    this.btnEout.addEventListener("click", () => {
      const active = this.btnEout.getAttribute("data-active") === "true";
      const next = !active;
      this.btnEout.setAttribute("data-active", String(next));
      this.btnEout.querySelector(".btn-val").textContent = next ? "1" : "0";
      this.syncInputs();
    });

    this.btnClk.addEventListener("click", () => {
      this.audio.playRelayClick();
      const result = this.logic.triggerClockEdge();
      this.handleSequentialStep(result);
      this.updateHUD();
    });

    this.camButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.camButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const view = btn.getAttribute("data-view");
        this.scene.setCameraView(view);
      });
    });
  }

  syncManualSwitchState() {
    this.btnEin.setAttribute("data-active", String(Boolean(this.logic.Ein)));
    this.btnEin.querySelector(".btn-val").textContent = this.logic.Ein
      ? "1"
      : "0";

    this.btnEout.setAttribute("data-active", String(Boolean(this.logic.Eout)));
    this.btnEout.querySelector(".btn-val").textContent = this.logic.Eout
      ? "1"
      : "0";
  }

  syncInputs() {
    const ein = this.btnEin.getAttribute("data-active") === "true";
    const eout = this.btnEout.getAttribute("data-active") === "true";
    this.logic.setInputs(ein, eout);
    this.updateHUD();
  }

  handleSequentialStep(result) {
    const newCount = result.count;
    const diff = newCount - this.prevCount;
    const bothSensorsActive = this.logic.Ein === 1 && this.logic.Eout === 1;

    // CASO 1: Ambos sensores en 1 (Ein = 1, Eout = 1) -> Entra uno (+1) y sale otro (-1) simultáneamente
    if (bothSensorsActive && diff === 0) {
      if (this.prevCount > 0) {
        // Primero liberamos el puesto del carro que sale
        const vacatedBay = this.vehicles.removeParkedCar({
          onApproachGate: () => {
            this.audio.playServoSound();
            this.scene.setExitBarrier(true);
            this.uiGateOut.textContent = "Abierta";
          },
          onPassedGate: () => {
            this.scene.setExitBarrier(false);
            this.uiGateOut.textContent = "Cerrada";
          },
          onComplete: () => {},
        });

        // Al mismo tiempo ingresa el carro nuevo (prefiriendo otro puesto libre si lo hay)
        this.vehicles.parkNewCar(
          {
            onApproachGate: () => {
              this.audio.playServoSound();
              this.scene.setEntranceBarrier(true);
              this.uiGateIn.textContent = "Abierta";
            },
            onPassedGate: () => {
              this.scene.setEntranceBarrier(false);
              this.uiGateIn.textContent = "Cerrada";
            },
            onComplete: () => {},
          },
          vacatedBay,
        );
      } else {
        // Si estaba en 0/7, un auto entra por la garita izquierda y sale directo por la derecha
        this.vehicles.passThroughCar({
          onApproachInGate: () => {
            this.audio.playServoSound();
            this.scene.setEntranceBarrier(true);
            this.uiGateIn.textContent = "Abierta";
          },
          onPassedInGate: () => {
            this.scene.setEntranceBarrier(false);
            this.uiGateIn.textContent = "Cerrada";
          },
          onApproachOutGate: () => {
            this.audio.playServoSound();
            this.scene.setExitBarrier(true);
            this.uiGateOut.textContent = "Abierta";
          },
          onPassedOutGate: () => {
            this.scene.setExitBarrier(false);
            this.uiGateOut.textContent = "Cerrada";
          },
        });
      }
    }
    // CASO 2: Incrementa (+1) -> Entra auto al primer puesto libre disponible
    else if (diff > 0) {
      this.vehicles.parkNewCar({
        onApproachGate: () => {
          this.audio.playServoSound();
          this.scene.setEntranceBarrier(true);
          this.uiGateIn.textContent = "Abierta";
        },
        onPassedGate: () => {
          this.scene.setEntranceBarrier(false);
          this.uiGateIn.textContent = "Cerrada";
        },
        onComplete: () => {},
      });
    }
    // CASO 3: Decrementa (-1) -> Sale un auto que YA esté estacionado
    else if (diff < 0) {
      this.vehicles.removeParkedCar({
        onApproachGate: () => {
          this.audio.playServoSound();
          this.scene.setExitBarrier(true);
          this.uiGateOut.textContent = "Abierta";
        },
        onPassedGate: () => {
          this.scene.setExitBarrier(false);
          this.uiGateOut.textContent = "Cerrada";
        },
        onComplete: () => {},
      });
    }

    // Alarma por sobrecupo
    const isAlarm = Boolean(result.alarm);
    this.scene.setAlarmBeacon(isAlarm);
    this.audio.setAlarm(isAlarm);

    // Actualizar el Tótem Electrónico 3D en la escena
    this.scene.updateDisplayTotem(newCount, isAlarm);

    this.prevCount = newCount;
  }

  updateHUD() {
    const count = this.logic.getDecimalCount();
    const terms = this.logic.terms;
    const isAlarm = this.logic.AlarmLatch === 1;

    // Ocupación simple
    this.uiOccupancy.textContent = `${count} / 7`;
    const freeBays = 7 - count;
    this.uiAvailable.textContent =
      freeBays > 0 ? `${freeBays} puestos libres` : "Sin puestos disponibles";

    const percentage = (count / 7) * 100;
    this.uiProgress.style.width = `${percentage}%`;
    if (count >= 7) {
      this.uiProgress.classList.add("full");
    } else {
      this.uiProgress.classList.remove("full");
    }

    // Estado de alarma
    if (isAlarm) {
      this.uiAlarmBanner.classList.add("active");
      this.uiAlarmText.textContent = "¡ESTACIONAMIENTO LLENO! ALARMA ACTIVADA";
    } else {
      this.uiAlarmBanner.classList.remove("active");
      this.uiAlarmText.textContent =
        freeBays > 0
          ? "ESTADO: PUESTOS DISPONIBLES"
          : "ESTADO: CAPACIDAD COMPLETA";
    }

    // Display de 7 segmentos 2D
    const segs = this.logic.getDecoderSegments();
    for (const [segKey, element] of Object.entries(this.segElements)) {
      if (segs[segKey] === 1) {
        element.classList.add("on");
      } else {
        element.classList.remove("on");
      }
    }

    // Panel técnico (Flip-flops)
    this.uiQ2.textContent = this.logic.Q2;
    this.uiQ1.textContent = this.logic.Q1;
    this.uiQ0.textContent = this.logic.Q0;

    this.uiTermsQ2.textContent = `J:${terms.J2} K:${terms.K2}`;
    this.uiTermsQ1.textContent = `D:${terms.D1}`;
    this.uiTermsQ0.textContent = `T:${terms.T0}`;

    this.uiLatchStatus.textContent = `Q = ${this.logic.AlarmLatch}`;
    this.uiLatchS.textContent = `S = ${terms.S}`;
    this.uiLatchR.textContent = `R = ${terms.R}`;
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.vehicles.update(delta);
    this.scene.update(delta);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new ApplicationController();
});
