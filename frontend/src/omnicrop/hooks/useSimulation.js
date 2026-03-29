import { startTransition, useEffect, useRef, useState } from "react";

import {
  defaultSimulationAdjustments,
  simulateFarm,
} from "../api/simulationApi";
import { createSimulationRequestGate } from "../lib/simulationRequestGate";

function adjustmentsEqual(left, right) {
  return (
    left.risk_tolerance === right.risk_tolerance &&
    left.delay_days === right.delay_days &&
    left.rain_adjustment_pct === right.rain_adjustment_pct &&
    left.market_outlook === right.market_outlook &&
    left.field_readiness_override === right.field_readiness_override &&
    left.crop_preference === right.crop_preference
  );
}

function createSimulationState(analysisVersion) {
  return {
    analysisVersion,
    adjustments: defaultSimulationAdjustments,
    simulationResult: null,
    simulationError: "",
    isSimulating: false,
  };
}

function useSimulation({ analysisVersion, baseContext, userInputs, enabled }) {
  const [state, setState] = useState(() =>
    createSimulationState(analysisVersion),
  );
  const gateRef = useRef(createSimulationRequestGate());
  const activeState =
    state.analysisVersion === analysisVersion
      ? state
      : createSimulationState(analysisVersion);
  const adjustments = activeState.adjustments;
  const isSimulationDirty = !adjustmentsEqual(
    adjustments,
    defaultSimulationAdjustments,
  );

  useEffect(() => {
    if (!enabled || !baseContext || !userInputs || !isSimulationDirty) {
      return;
    }

    const requestId = gateRef.current.next();
    const timeoutId = window.setTimeout(async () => {
      setState((current) => {
        const baseState =
          current.analysisVersion === analysisVersion
            ? current
            : createSimulationState(analysisVersion);
        return { ...baseState, isSimulating: true };
      });

      const { data, error } = await simulateFarm({
        baseContext,
        userInputs,
        adjustments,
      });

      if (!gateRef.current.isCurrent(requestId)) {
        return;
      }

      if (data) {
        startTransition(() => {
          setState((current) => {
            const baseState =
              current.analysisVersion === analysisVersion
                ? current
                : createSimulationState(analysisVersion);
            return {
              ...baseState,
              simulationResult: data,
              simulationError: "",
              isSimulating: false,
            };
          });
        });
        return;
      }

      setState((current) => {
        const baseState =
          current.analysisVersion === analysisVersion
            ? current
            : createSimulationState(analysisVersion);
        return {
          ...baseState,
          simulationError: error || "Simulation update failed.",
          isSimulating: false,
        };
      });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    adjustments,
    analysisVersion,
    baseContext,
    enabled,
    isSimulationDirty,
    userInputs,
  ]);

  function updateAdjustment(name, value) {
    setState((current) => {
      const baseState =
        current.analysisVersion === analysisVersion
          ? current
          : createSimulationState(analysisVersion);
      return {
        ...baseState,
        adjustments: { ...baseState.adjustments, [name]: value },
        simulationError: "",
        isSimulating: false,
      };
    });
  }

  function resetAdjustments() {
    gateRef.current.cancel();
    setState(createSimulationState(analysisVersion));
  }

  return {
    adjustments,
    isSimulationDirty,
    isSimulating: activeState.isSimulating && isSimulationDirty,
    resetAdjustments,
    simulationError: isSimulationDirty ? activeState.simulationError : "",
    simulationResult: isSimulationDirty ? activeState.simulationResult : null,
    updateAdjustment,
  };
}

export default useSimulation;
