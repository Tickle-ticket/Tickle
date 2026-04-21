"""Preprocess: 브라우저 이벤트 모델로 인한 중복 클릭 제거.

checkbox/radio 의 <label><input/></label> 구조는 label 클릭 시 input 에도
click 이벤트 전파됨. label 은 id 가 없어 targetId=null 로 찍혀 misclick_rate
false positive 를 만듦. 쌍을 찾아 label 쪽을 드롭.
"""
from typing import List, Dict

LABEL_DUP_WINDOW_MS = 20


def dedupe_label_clicks(events: List[Dict]) -> List[Dict]:
    """event 시퀀스에서 label→input 중복 click 쌍 중 label 쪽을 제거.

    판정 규칙:
      - LABEL click 이벤트 이후 LABEL_DUP_WINDOW_MS 이내 다음 click이
      - INPUT tag + targetId 존재하면 LABEL 이벤트 드롭.
      - 사이에 끼는 mousemove 등 비-click 이벤트는 무시.
    """
    out = []
    n = len(events)
    for i, cur in enumerate(events):
        if cur.get("type") == "click" and cur.get("targetTag") == "LABEL":
            cur_t = cur.get("t", 0)
            drop = False
            for j in range(i + 1, n):
                nxt = events[j]
                if nxt.get("type") != "click":
                    continue
                if (nxt.get("t", 0) - cur_t) > LABEL_DUP_WINDOW_MS:
                    break
                if nxt.get("targetTag") == "INPUT" and nxt.get("targetId"):
                    drop = True
                break
            if drop:
                continue
        out.append(cur)
    return out
