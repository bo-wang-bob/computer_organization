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


if __name__ == "__main__":
    unittest.main()
