# FleetMine

Mining fleet monitoring dashboard focused on operational visibility, telemetry, alerts, incidents and maintenance workflows.

## Overview

FleetMine is a front-end application designed to model a control center for mining fleets. It centralizes vehicle status, map-based monitoring, operational alerts, incidents, maintenance work orders and fleet health indicators in a single interface.

The current repository is a portfolio/demo implementation backed by mock operational data, making it easy to explore the product experience without requiring a production backend.

## Main Features

- Fleet dashboard with operational KPIs
- Vehicle inventory and detailed vehicle views
- Interactive maps with Leaflet
- Telemetry and health indicators
- Alert and incident management views
- Predictive/preventive maintenance workflows
- User and configuration screens
- Protected routes and authentication flow
- Responsive component-based UI

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Leaflet / React Leaflet
- Recharts
- Lucide React
- ESLint

## Project Structure

```text
src/
├── auth/          # Authentication context, services and protected routes
├── components/    # Shared UI and layout components
├── data/          # Mock operational data
├── pages/         # Dashboard, vehicles, alerts, incidents, maintenance, etc.
├── types/         # Domain models and TypeScript types
├── App.tsx        # Application routes and global UI state
└── main.tsx       # Application entry point
```

## Getting Started

### Requirements

- Node.js
- npm

### Installation

```bash
git clone https://github.com/KevinT31/FleetMine.git
cd FleetMine
npm install
npm run dev
```

### Quality Checks

```bash
npm run lint
npm run build
```

## Current Scope

This repository currently uses local/mock data for fleet telemetry and operational scenarios. It is intended to demonstrate the user experience and front-end architecture for a mining fleet monitoring platform.

## Portfolio Notes

The project demonstrates front-end engineering applied to an industrial/mining use case, including dashboard design, geospatial visualization, operational workflows, domain modeling and TypeScript-based component architecture.
