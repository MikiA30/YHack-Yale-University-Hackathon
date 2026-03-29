import re

ZIP_CODE_PATTERN = re.compile(r"^\d{5}(?:-\d{4})?$")


def normalize_location_query(value: str) -> str:
    return " ".join(value.strip().split())


def looks_like_zip_code(value: str) -> bool:
    return bool(ZIP_CODE_PATTERN.fullmatch(normalize_location_query(value)))
