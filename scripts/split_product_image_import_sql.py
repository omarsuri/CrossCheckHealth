from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT_SQL = ROOT / "supabase" / "import-indian-health-products-with-images.sql"
OUTPUT_DIR = ROOT / "supabase" / "product-image-import-chunks"
MAX_CHUNK_BYTES = 140_000


def split_statements(sql: str):
    statements = []
    start = 0
    in_quote = False
    index = 0

    while index < len(sql):
        char = sql[index]
        if char == "'":
            if in_quote and index + 1 < len(sql) and sql[index + 1] == "'":
                index += 2
                continue
            in_quote = not in_quote
        elif char == ";" and not in_quote:
            statement = sql[start:index + 1].strip()
            if statement:
                statements.append(statement)
            start = index + 1
        index += 1

    tail = sql[start:].strip()
    if tail:
        statements.append(tail)
    return statements


def clean_output_dir():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for old_file in OUTPUT_DIR.glob("*.sql"):
        old_file.unlink()


def write_chunks(statements):
    chunks = []
    current = []
    current_size = 0

    for statement in statements:
        statement_size = len(statement.encode("utf-8")) + 2
        if current and current_size + statement_size > MAX_CHUNK_BYTES:
            chunks.append(current)
            current = []
            current_size = 0
        current.append(statement)
        current_size += statement_size

    if current:
        chunks.append(current)

    total = len(chunks)
    manifest_lines = [
        "# Product Image Import Chunks",
        "",
        "Run these SQL files in Supabase SQL Editor in numbered order.",
        "Each file is kept below the SQL Editor size limit.",
        "",
    ]

    for index, chunk in enumerate(chunks, start=1):
        filename = f"{index:02d}-product-image-import.sql"
        path = OUTPUT_DIR / filename
        body = [
            f"-- Product image import chunk {index} of {total}",
            "-- Run chunks in numbered order.",
            "",
            *chunk,
            "",
        ]
        path.write_text("\n".join(body), encoding="utf-8")
        size = path.stat().st_size
        manifest_lines.append(f"{index}. `{filename}` - {size:,} bytes")

    (OUTPUT_DIR / "README.md").write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")
    return chunks


def main():
    sql = INPUT_SQL.read_text(encoding="utf-8")
    statements = split_statements(sql)
    clean_output_dir()
    chunks = write_chunks(statements)
    print(f"Statements: {len(statements)}")
    print(f"Chunks: {len(chunks)}")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
