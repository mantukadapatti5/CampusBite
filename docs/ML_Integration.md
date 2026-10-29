# CampusBite — ML Integration (for report / PPT)

## What was added
| Where | What |
|---|---|
| `backend/src/ml/` | Random Forest + Ridge Regression (pure JS), dataset simulator, trainer/evaluator, prediction service |
| `backend/src/ml/data/` | 3 generated CSV datasets |
| `backend/src/ml/models/model_store.json` | trained models + metrics (loaded at server start) |
| `/api/ml/*` | overview, crowd-forecast, demand-forecast, wait-time, retrain, dataset download (manager/admin only) |
| Manager portal → **ML Insights** | hourly crowd chart, tomorrow's demand table, wait-time predictor, model comparison, retrain button |
| Student order tracking | wait time now comes from the ML model |
| Manager dashboard | "Suggested prep for tomorrow" now ML-based |

## Replacement text — Slide 16 "AI / ML Models & Algorithms"
- **Random Forest Regressor** — crowd prediction (orders/hour) and demand forecast (units/item/day). Ensemble of decision trees trained on bootstrap samples; prediction = average of trees.
- **Ridge Regression** — linear model with L2 regularisation and one-hot encoded hour/weekday/month; selected for wait-time prediction because it had the lowest hold-out error.
- **Model selection** — each task trains Random Forest, Ridge and the old non-ML method; the lowest hold-out RMSE is deployed.
- **Evaluation** — 20% hold-out (whole days for crowd/demand), metrics MAE, RMSE, R².

| Task | Deployed model | MAE | RMSE | R² | RMSE vs old method |
|---|---|---|---|---|---|
| Crowd (orders/hour) | Random Forest | 4.64 | 6.14 | 0.862 | −34.3% |
| Demand (units/item/day) | Random Forest | 3.70 | 5.16 | 0.885 | −30.2% |
| Wait time (minutes) | Ridge Regression | 1.76 | 2.27 | 0.854 | −84.2% |

## Replacement text — Slide 14 "Dataset & Data Sources"
- **Generated datasets** from a simulator of a year of canteen activity using the real 37-item menu: `hourly_orders.csv` (4,380 rows), `daily_item_sales.csv` (13,505 rows), `order_wait_times.csv` (6,000 rows).
- **Features:** weekday, hour, month, holiday, exam period, rain, temperature, item popularity/category/price/veg, queue length, items in order, prep time.
- **Live data:** "Retrain" can append the last 120 days of real orders from the database.

## Honest limits (say this in the viva)
- Metrics are on **simulated data**, so they show the pipeline works; they are not proof of accuracy in a real canteen.
- The "−84%" wait-time gain is partly because the old rule (3 min per order ahead) was compared against a simulator that I defined; treat it as illustrative.
- Live-data retraining does not know about real holidays/exams/rain (stored as 0) and has no real wait-time labels, so the wait model is trained only on the generated data.
