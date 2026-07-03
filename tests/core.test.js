const assert = require("assert");
const core = require("../src/core.js");

function testTwosComplement() {
  const result = core.simulateTwosComplementAdd(5, -3, 8);
  assert.strictEqual(result.xBinary, "00000101");
  assert.strictEqual(result.yBinary, "11111101");
  assert.strictEqual(result.sumBinary, "00000010");
  assert.strictEqual(result.result, 2);
  assert.strictEqual(result.overflow, false);

  const overflow = core.simulateTwosComplementAdd(127, 1, 8);
  assert.strictEqual(overflow.sumBinary, "10000000");
  assert.strictEqual(overflow.overflow, true);
}

function testCache() {
  const result = core.simulateCacheAddress({
    address: "0x3A7",
    addressBits: 12,
    lines: 16,
    blockSize: 4,
  });
  assert.strictEqual(result.offsetBits, 2);
  assert.strictEqual(result.indexBits, 4);
  assert.strictEqual(result.tagBits, 6);
  assert.strictEqual(result.index, 9);
  assert.strictEqual(result.offset, 3);
}

function testAssembly() {
  const program = `addi x1, x0, 5
addi x2, x0, 7
add x3, x1, x2
sw x3, 0(x0)
lw x4, 0(x0)`;
  const result = core.executeAssembly(program);
  assert.strictEqual(result.finalRegisters.x1, 5);
  assert.strictEqual(result.finalRegisters.x2, 7);
  assert.strictEqual(result.finalRegisters.x3, 12);
  assert.strictEqual(result.finalRegisters.x4, 12);
  assert.strictEqual(result.finalMemory[0], 12);
}

function testPipeline() {
  const result = core.simulatePipeline(`lw x1, 0(x2)
add x3, x1, x4`, { forwarding: true });
  assert.strictEqual(result.hazards.length, 1);
  assert.strictEqual(result.hazards[0].type, "load-use");
  assert.ok(result.timeline[1].cells.includes("STALL"));
}

function testDiagnosis() {
  const result = core.diagnosePractice("cache_offset", "4 位");
  assert.strictEqual(result.correct, true);
}

testTwosComplement();
testCache();
testAssembly();
testPipeline();
testDiagnosis();

console.log("core.test.js passed");

