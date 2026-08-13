/**
 * Traced Pipeline Harness Module Stub (Phase 6)
 */
export class PipelineHarness {
  constructor() {
    this.stages = [];
  }

  startStage(name) {
    const stage = {
      name,
      startTime: Date.now(),
      endTime: null,
      status: 'running',
      retryCount: 0,
    };
    this.stages.push(stage);
    return stage;
  }

  endStage(name, status = 'success') {
    const stage = this.stages.find((s) => s.name === name);
    if (stage) {
      stage.endTime = Date.now();
      stage.durationMs = stage.endTime - stage.startTime;
      stage.status = status;
    }
  }

  getSummary() {
    return {
      totalLatencyMs: this.stages.reduce((acc, s) => acc + (s.durationMs || 0), 0),
      stages: this.stages,
    };
  }
}
