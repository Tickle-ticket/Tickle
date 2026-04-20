"""사람 행동 녹화 CLI.

실행:
    python record_human.py --target local_login
    python record_human.py --url http://localhost:8080
"""
import argparse
import os
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent
os.chdir(_PROJECT_ROOT)
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))


def main():
    parser = argparse.ArgumentParser(description="사람 행동 녹화")
    parser.add_argument("--url", default=None,
                        help="녹화할 웹사이트 URL (선택)")
    parser.add_argument("--target", default=None,
                        help="타겟 설정에서 URL 가져오기")

    args = parser.parse_args()

    url = args.url
    if args.target and not url:
        from macro._config import load_target
        target = load_target(args.target)
        url = target.get("url")

    from human.recorder import HumanRecorder
    recorder = HumanRecorder()
    recorder.start(url=url)


if __name__ == "__main__":
    main()
