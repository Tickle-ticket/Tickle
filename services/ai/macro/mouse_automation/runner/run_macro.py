"""매크로 실행 CLI.

실행:
    python run_macro.py --type pyautogui --level 1 --target local_login
"""
import argparse
import os
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
os.chdir(_PROJECT_ROOT)
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))


def main():
    parser = argparse.ArgumentParser(description="매크로 실행")
    parser.add_argument("--type", choices=["pyautogui", "playwright"], required=True,
                        help="매크로 도구 타입")
    parser.add_argument("--level", type=int, choices=[1, 2], required=True,
                        help="매크로 레벨 (1=기본, 2=회피)")
    parser.add_argument("--target", required=True,
                        help="타겟 설정 이름 (configs/macro_targets/ 내 yaml 파일명)")
    parser.add_argument("--repeat", type=int, default=1,
                        help="반복 실행 횟수")
    parser.add_argument("--config", default=None,
                        help="전역 설정 파일 경로 (기본: configs/macro.yaml)")

    args = parser.parse_args()

    if args.type == "pyautogui":
        if args.level == 1:
            from macro.mouse_automation.runner.pyautogui_lv1 import PyAutoGUILv1 as MacroClass
        else:
            from macro.mouse_automation.runner.pyautogui_lv2 import PyAutoGUILv2 as MacroClass
    elif args.type == "playwright":
        if args.level == 1:
            from macro.browser_automation.playwright_lv1 import PlaywrightLv1 as MacroClass
        else:
            from macro.browser_automation.playwright_lv2 import PlaywrightLv2 as MacroClass

    print(f"=== 매크로 실행: {args.type} Lv{args.level} ===")
    print(f"타겟: {args.target}, 반복: {args.repeat}회\n")

    session_ids = []
    for i in range(args.repeat):
        if args.repeat > 1:
            print(f"\n--- 실행 {i + 1}/{args.repeat} ---")
        macro = MacroClass(target_name=args.target, config_path=args.config)
        sid = macro.run()
        session_ids.append(sid)

    print(f"\n=== 완료: {len(session_ids)}개 세션 생성 ===")
    for sid in session_ids:
        print(f"  - {sid}")


if __name__ == "__main__":
    main()
