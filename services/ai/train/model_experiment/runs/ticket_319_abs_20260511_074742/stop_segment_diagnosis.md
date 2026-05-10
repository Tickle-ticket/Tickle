# mouse_stop_segment_count 분포 진단

raw lv3_auc = 0.0 (065547) 의 원인을 NaN imputation 가설로 검토.
ticket 320 univariate 평가는 `SimpleImputer(strategy='median')` 사용 → 
한 그룹이 거의 전체 NaN 이면 median 으로 collapse 되어 LogReg AUC 가 0 또는 1 의 극단에 위치할 수 있음.

| group | n | non_null | null | non_null_ratio | median | min | max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| human | 551 | 51 | 500 | 0.093 | 12.0000 | 5.0000 | 25.0000 |
| lv2_macro | 101 | 101 | 0 | 1.000 | 9.0000 | 4.0000 | 15.0000 |
| lv3_balabit_kde | 50 | 50 | 0 | 1.000 | 114.0000 | 23.0000 | 378.0000 |
| today_macro | 251 | 251 | 0 | 1.000 | 1.0000 | 1.0000 | 12.0000 |

## 판정

- null 비율 >= 50% group: ['human']
- null 비율 <  50% group: ['lv2_macro', 'lv3_balabit_kde', 'today_macro']

- 일부 group 은 high-null, 다른 group 은 low-null → **NaN imputation 아티팩트 강한 의심**.
- median imputation 시 high-null group 은 training median 으로 collapse 되어, low-null group 의 실제 분포와 인공적으로 분리됨.
- LogReg 가 이 인공 분리를 학습하면 raw AUC 가 0 또는 1 의 극단으로 편향됨 (방향은 high-null group 의 라벨에 따라 결정).
- XGBoost 는 NaN native 처리이므로 cleaned pool 에 포함시켜도 LogReg AUC 와 의미는 다름. 단, 학습 시 NaN split 패턴이 trial 인구 분포 (e.g., Balabit 가 human 전부) 에 의존하므로 OOD generalization 보장 X.
