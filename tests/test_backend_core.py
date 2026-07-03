import unittest

from backend import core


class BackendCoreTest(unittest.TestCase):
    def test_question_answer_matches_twos_complement(self):
        result = core.answer_question("为什么补码可以把减法变成加法？", "all", "exam")

        self.assertTrue(result["matched"])
        self.assertEqual(result["knowledgePointId"], "twos_complement")
        self.assertIn("考试视角", result["modeNote"])

    def test_twos_complement_add(self):
        result = core.simulate_twos_complement_add(5, -3, 8)

        self.assertEqual(result["xBinary"], "00000101")
        self.assertEqual(result["yBinary"], "11111101")
        self.assertEqual(result["sumBinary"], "00000010")
        self.assertEqual(result["result"], 2)
        self.assertFalse(result["overflow"])

        overflow = core.simulate_twos_complement_add(127, 1, 8)
        self.assertEqual(overflow["sumBinary"], "10000000")
        self.assertTrue(overflow["overflow"])

    def test_cache_address_split(self):
        result = core.simulate_cache_address(
            {"address": "0x3A7", "addressBits": 12, "lines": 16, "blockSize": 4}
        )

        self.assertEqual(result["offsetBits"], 2)
        self.assertEqual(result["indexBits"], 4)
        self.assertEqual(result["tagBits"], 6)
        self.assertEqual(result["index"], 9)
        self.assertEqual(result["offset"], 3)
        self.assertEqual(result["rows"][9]["block"], 233)

    def test_assembly_execution_supports_riscv_and_simple_mov(self):
        riscv = """addi x1, x0, 5
addi x2, x0, 7
add x3, x1, x2
sw x3, 0(x0)
lw x4, 0(x0)"""
        riscv_result = core.execute_assembly(riscv)
        self.assertEqual(riscv_result["finalRegisters"]["x1"], 5)
        self.assertEqual(riscv_result["finalRegisters"]["x2"], 7)
        self.assertEqual(riscv_result["finalRegisters"]["x3"], 12)
        self.assertEqual(riscv_result["finalRegisters"]["x4"], 12)
        self.assertEqual(riscv_result["finalMemory"]["0"], 12)

        simple = """MOV R1, #5
MOV R2, #3
ADD R3, R1, R2"""
        simple_result = core.execute_assembly(simple)
        self.assertEqual(simple_result["finalRegisters"]["R3"], 8)

    def test_pipeline_detects_load_use_hazard(self):
        result = core.simulate_pipeline(
            """lw x1, 0(x2)
add x3, x1, x4""",
            {"forwarding": True},
        )

        self.assertEqual(result["hazards"][0]["type"], "load-use")
        self.assertIn("STALL", result["timeline"][1]["cells"])

    def test_assembly_snapshot(self):
        result = core.assembly_snapshot(
            """addi x1, x0, 5
addi x2, x0, 7""",
            0,
        )

        self.assertEqual(result["cursor"], 0)
        self.assertEqual(result["registers"]["x1"], 5)
        self.assertEqual(result["registers"]["x2"], 0)
        self.assertEqual(result["changedRegisters"], ["x1"])

    def test_diagnosis_and_dispatch(self):
        diagnosis = core.diagnose_practice("cache_offset", "4 位")
        self.assertTrue(diagnosis["correct"])

        dispatch = core.dispatch_agent({"message": "帮我解释 lw x5, 8(x2)", "mode": "standard"})
        self.assertEqual(dispatch["intent"], "assembly_help")
        self.assertEqual(dispatch["tool"], "execute_assembly")


if __name__ == "__main__":
    unittest.main()
