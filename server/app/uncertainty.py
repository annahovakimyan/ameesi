"""Flags for charts whose birth time is approximate or unknown (docs/engine-spec.md)."""
from .engine import PLANETS


def _aspect_keys(chart: dict) -> set[tuple[str, str, str]]:
    return {(a["a"], a["b"], a["type"]) for a in chart["aspects"]}


def flag_uncertain(mid: dict, samples: list[dict]) -> dict:
    """Mark everything in the midpoint chart whose sign or house differs in any sample.

    `samples` are charts across the birth-time window (including the midpoint).
    Returns a copy of `mid` with `uncertain` flags set and `aspects_uncertain` added.
    """
    bodies = {}
    for b, body in mid["bodies"].items():
        changes = any(s["bodies"][b]["sign"] != body["sign"] or s["bodies"][b]["house"] != body["house"]
                      for s in samples)
        bodies[b] = {**body, "uncertain": changes}

    angles = houses = None
    if mid["angles"]:
        angles = {k: {**a, "uncertain": any(s["angles"][k]["sign"] != a["sign"] for s in samples)}
                  for k, a in mid["angles"].items()}
        houses = [{**h, "uncertain": any(s["houses"][i]["sign"] != h["sign"] for s in samples)}
                  for i, h in enumerate(mid["houses"])]

    keys = [_aspect_keys(s) for s in samples]
    changing = set.union(*keys) - set.intersection(*keys)
    order = {p: i for i, p in enumerate(PLANETS)}
    aspects_uncertain = [{"a": a, "b": b, "type": t}
                         for a, b, t in sorted(changing, key=lambda k: (order[k[0]], order[k[1]], k[2]))]
    return {**mid, "bodies": bodies, "angles": angles, "houses": houses,
            "aspects_uncertain": aspects_uncertain}


def moon_changes_sign(start_of_day: dict, end_of_day: dict) -> bool:
    return start_of_day["bodies"]["moon"]["sign"] != end_of_day["bodies"]["moon"]["sign"]
