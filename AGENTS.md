# Architecture rules

- Scope PDF calculator typography overrides to `.pdf-calculator-panel` and exclude the shared stamp; this preserves other editor panels and native stamp sizing.
- Persist optional calculator result overrides and per-line stamp visibility in PDF edit state; shared stamp rendering uses these fields while preserving legacy stamp defaults and arithmetic.