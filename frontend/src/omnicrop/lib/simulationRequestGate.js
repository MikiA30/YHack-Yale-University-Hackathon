export function createSimulationRequestGate() {
  let currentRequestId = 0;

  return {
    next() {
      currentRequestId += 1;
      return currentRequestId;
    },
    isCurrent(requestId) {
      return requestId === currentRequestId;
    },
    cancel() {
      currentRequestId += 1;
    },
  };
}
