# FleetMine — Architecture

## Goal

Keep the UI useful as a standalone portfolio demo while preserving a clear boundary for a future real backend.

## Layers

```text
Mock data / future API
        ↓
Services + domain hooks
        ↓
Operational pages
   ├─ charts
   ├─ map
   ├─ KPI cards
   └─ workflow views
        ↓
Shared layout + routing + auth
```

## Main Domains

- vehicles
- alerts
- incidents
- maintenance
- reports
- users/settings

## Design Principle

The application should not require page components to know whether the source is mock data or a remote API. That concern belongs in hooks/services.
