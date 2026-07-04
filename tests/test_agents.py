import unittest
from unittest.mock import patch

from backend import agents
from backend.config import load_llm_config


class FakeClient:
    def chat(self, messages, **kwargs):
        self.messages = messages
        return {
            "content": "这是 DeepSeek 模拟回答。",
            "model": "deepseek-v4-pro",
            "usage": {"prompt_tokens": 10, "completion_tokens": 6},
        }


class FakeDemoClient:
    def chat(self, messages, **kwargs):
        self.messages = messages
        self.kwargs = kwargs
        return {
            "content": (
                '{"supported": true, "targetPanel": "cache-sim", '
                '"title": "Cache demo", '
                '"inputs": {"accesses": "0x00 0x40 0x00", "lines": 4, "blockSize": 4, "mapping": "direct"}, '
                '"reason": "Cache conflict demo."}'
            ),
            "model": "deepseek-v4-pro",
            "usage": {"prompt_tokens": 20, "completion_tokens": 12},
        }


class AgentTest(unittest.TestCase):
    def test_load_llm_config_from_environment(self):
        with patch.dict(
            "os.environ",
            {"DEEPSEEK_API_KEY": "sk-test", "DEEPSEEK_MODEL": "deepseek-v4-flash"},
            clear=False,
        ):
            config = load_llm_config()

        self.assertTrue(config.configured)
        self.assertEqual(config.api_key, "sk-test")
        self.assertEqual(config.model, "deepseek-v4-flash")

    def test_list_agents_contains_orchestrator_and_specialists(self):
        agent_ids = {item["id"] for item in agents.list_agents()}

        self.assertIn("auto", agent_ids)
        self.assertIn("qa", agent_ids)
        self.assertIn("derivation", agent_ids)
        self.assertIn("assembly", agent_ids)
        self.assertIn("diagnosis", agent_ids)

    def test_run_agent_can_use_fake_deepseek_client(self):
        fake = FakeClient()
        result = agents.run_agent(
            {
                "agentId": "derivation",
                "message": "请解释 5 和 -3 的 8 位补码加法",
                "useLLM": True,
            },
            client=fake,
        )

        self.assertEqual(result["answer"], "这是 DeepSeek 模拟回答。")
        self.assertEqual(result["model"], "deepseek-v4-pro")
        self.assertFalse(result["usedFallback"])
        self.assertEqual(result["context"]["tool"], "simulate_twos_complement_add")
        self.assertEqual(result["context"]["toolResult"]["result"], 2)
        self.assertIn("规则工具上下文", fake.messages[1]["content"])

    def test_run_agent_without_llm_uses_rule_fallback(self):
        result = agents.run_agent(
            {
                "agentId": "assembly",
                "message": "请解释：\naddi x1, x0, 5\nadd x2, x1, x1",
                "useLLM": False,
            }
        )

        self.assertTrue(result["usedFallback"])
        self.assertEqual(result["agent"]["id"], "assembly")
        self.assertEqual(result["context"]["tool"], "execute_assembly")
        self.assertEqual(result["context"]["toolResult"]["finalRegisters"]["x2"], 10)


    def test_demo_plan_without_llm_uses_pipeline_template(self):
        result = agents.plan_demo({"message": "please demonstrate load-use hazard", "useLLM": False})

        self.assertTrue(result["supported"])
        self.assertTrue(result["usedFallback"])
        self.assertEqual(result["targetPanel"], "pipeline-sim")
        self.assertIn("lw x1", result["inputs"]["program"])
        self.assertEqual(result["simulationPreview"]["tool"], "simulate_pipeline")
        self.assertGreaterEqual(result["simulationPreview"]["hazardCount"], 1)

    def test_demo_plan_returns_unsupported_when_no_simulation_matches(self):
        result = agents.plan_demo({"message": "please demonstrate process scheduling", "useLLM": False})

        self.assertFalse(result["supported"])
        self.assertTrue(result["usedFallback"])
        self.assertIsNone(result["targetPanel"])
        self.assertIn("暂不支持", result["reason"])

    def test_demo_plan_can_use_fake_deepseek_json(self):
        fake = FakeDemoClient()
        result = agents.plan_demo({"message": "demo cache conflict", "useLLM": True}, client=fake)

        self.assertTrue(result["supported"])
        self.assertFalse(result["usedFallback"])
        self.assertEqual(result["targetPanel"], "cache-sim")
        self.assertEqual(result["model"], "deepseek-v4-pro")
        self.assertEqual(result["inputs"]["mapping"], "direct")
        self.assertEqual(result["simulationPreview"]["tool"], "simulate_cache_system")
        self.assertIn("教师输入", fake.messages[1]["content"])


    def test_demo_plan_uses_fixed_point_values_from_prompt(self):
        result = agents.plan_demo({"message": "demo 8 bit two complement 127 1 overflow", "useLLM": False})

        self.assertTrue(result["supported"])
        self.assertEqual(result["targetPanel"], "twos-sim")
        self.assertEqual(result["inputs"]["demoType"], "fixed")
        self.assertEqual(result["inputs"]["bits"], 8)
        self.assertEqual(result["inputs"]["x"], 127)
        self.assertEqual(result["inputs"]["y"], 1)
        self.assertEqual(result["simulationPreview"]["tool"], "simulate_fixed_point_operation")

    def test_demo_plan_supports_virtual_memory(self):
        result = agents.plan_demo({"message": "demo virtual memory page replacement", "useLLM": False})

        self.assertTrue(result["supported"])
        self.assertEqual(result["targetPanel"], "virtual-sim")
        self.assertEqual(result["simulationPreview"]["tool"], "simulate_virtual_memory")
        self.assertIn("references", result["inputs"])

    def test_demo_plan_parses_memory_expansion_specs(self):
        result = agents.plan_demo({"message": "demo memory expansion 1Kx4 to 4Kx8", "useLLM": False})

        self.assertTrue(result["supported"])
        self.assertEqual(result["targetPanel"], "memory-expansion-sim")
        self.assertEqual(result["inputs"]["chipWords"], 1024)
        self.assertEqual(result["inputs"]["chipBits"], 4)
        self.assertEqual(result["inputs"]["targetWords"], 4096)
        self.assertEqual(result["inputs"]["targetBits"], 8)
        self.assertEqual(result["simulationPreview"]["tool"], "frontend_memory_expansion")


if __name__ == "__main__":
    unittest.main()
