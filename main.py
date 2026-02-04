from flask import Flask, render_template, jsonify, request
from services.sheets import get_credenciamentos, get_medicos
import urllib.parse
import unicodedata

app = Flask(__name__)

df_cred = get_credenciamentos()
df_med = get_medicos()

def normalizar(txt):
    if txt is None:
        return ""
    txt = str(txt).strip().upper()
    txt = unicodedata.normalize("NFKD", txt)
    txt = "".join(c for c in txt if not unicodedata.combining(c))
    return txt

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/credenciamentos")
def credenciamentos():
    return jsonify(df_cred.fillna("").to_dict(orient="records"))


@app.route("/api/medicos")
def medicos():
    empresa = request.args.get("empresa", "")
    empresa = normalizar(urllib.parse.unquote(empresa))

    df = df_med.copy()

    # garante existência da coluna
    if "EMPRESA CREDENCIADA" not in df.columns:
        return jsonify([])

    df["EMPRESA_N"] = df["EMPRESA CREDENCIADA"].apply(normalizar)

    df = df[df["EMPRESA_N"] == empresa]

    return jsonify(df.fillna("").to_dict(orient="records"))


if __name__ == "__main__":
    app.run(debug=True)
