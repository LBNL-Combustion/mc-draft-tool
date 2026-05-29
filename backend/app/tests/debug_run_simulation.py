"""
Debug script for run_simulation().

Run from repo root:
    python -m app.tests.debug_run_simulation

Or directly (from backend-api/):
    python app/tests/debug_run_simulation.py
"""
import json
import pprint
import sys
import os

# Allow running as a plain script from any cwd inside backend-api/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.models.simulation import run_simulation

CONFIG = {
    'parts': [
        {
            '_name': 'Straight Pipe',
            'type': 'single',
            'inner_diameter_ft': 0.5,
            'height_ft': 3,
            'z_ft': 0,
            'orientation': 'vertical',
            'T_ambient_K': 291.48,
            'Pa': 98457,
            'num_segments': 3,
            'thickness_w_m': 0.00076,
            'density_w_kg_m3': 7850,
            'cp_w_J_kg_K': 460,
            'k_w_W_m_K': 50,
            'epsilon_w': 0.8,
            'roughness_m': 0.00015,
        },
        {
            '_name': 'Chimney Straight',
            'type': 'triple',
            'inner_diameter_ft': 0.5,
            'height_ft': 3,
            'z_ft': 0,
            'orientation': 'vertical',
            'T_ambient_K': 291.48,
            'Pa': 98596,
            'num_segments': 3,
            'thickness_inner_m': 0.0005,
            'density_inner_kg_m3': 7850,
            'cp_inner_J_kg_K': 460,
            'k_inner_W_m_K': 26,
            'epsilon_inner': 0.35,
            'thickness_middle_m': 0.025,
            'density_middle_kg_m3': 100,
            'cp_middle_J_kg_K': 1050,
            'k_middle_W_m_K': 0.04,
            'thickness_outer_m': 0.0005,
            'density_outer_kg_m3': 8000,
            'cp_outer_J_kg_K': 500,
            'k_outer_W_m_K': 16,
            'epsilon_outer': 0.35,
            'air_gap_inner_m': 0,
            'air_gap_outer_m': 0,
            'roughness_m': 1e-06,
        },
    ],
    'elbows': [],
    'dt': 0.5,
    'total_time': 600,
    'pressure_from_elevation': 101325,
    'inlet_restriction': {
        'enable': True,
        'door_type': 'swivel',
        'door_width_ft': 1.2708,
        'door_height_ft': 0.8229,
        'Cd': 0.62,
        'A_leak_m2': 0.0125,
        'inlet_area_min_m2': 0.003,
        'K_stove': 0,
    },
    'door_schedule': [[0, 100], [90, 100], [95, 50], [300, 50], [305, 0]],
    'inlet_temp_profile': [
        [0, 473], [60, 523], [120, 548], [180, 523], [300, 473], [600, 423]
    ],
    'verbose': False,
}


def main():
    print("=" * 60)
    print("Running run_simulation() with debug config...")
    print("=" * 60)

    try:
        results = run_simulation(CONFIG)
    except Exception as exc:
        import traceback
        print("\n[ERROR] Simulation raised an exception:")
        traceback.print_exc()
        sys.exit(1)

    print("\n[OK] Simulation completed successfully.\n")

    print("--- Keys returned ---")
    for k in results:
        v = results[k]
        if isinstance(v, dict):
            print(f"  {k}: dict with keys {list(v.keys())}")
        elif isinstance(v, list):
            print(f"  {k}: list[{len(v)}]")
        else:
            print(f"  {k}: {v!r}")

    print("\n--- Full result (pretty-printed) ---")
    pprint.pprint(results, width=100, depth=4)

    # Also dump to a JSON file for inspection
    out_path = os.path.join(os.path.dirname(__file__), 'debug_output.json')
    with open(out_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nFull JSON written to: {out_path}")


if __name__ == '__main__':
    main()
