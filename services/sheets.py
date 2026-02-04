import os
import json
import gspread
import pandas as pd
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

# Carrega as variáveis do .env
load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

SHEET_ID = "1hKi6F6sJy1BF0Rd7jOVS9PUM7rnTpUB3GVwWIXK6zBE"


def get_client():
    # 1. Pega a string da variável de ambiente
    env_creds = os.getenv("GOOGLE_CREDENTIALS_JSON")
    
    if not env_creds:
        raise ValueError("A variável GOOGLE_CREDENTIALS_JSON não foi encontrada no .env")

    # 2. Converte a string JSON para um dicionário Python
    info = json.loads(env_creds)
    
    # 3. Usa 'from_service_account_info' em vez de 'from_service_account_file'
    creds = Credentials.from_service_account_info(
        info,
        scopes=SCOPES
    )
    
    return gspread.authorize(creds)


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = (
        df.columns
        .str.strip()
        .str.upper()
        .str.replace("\n", " ", regex=False)
    )
    return df


def get_credenciamentos():
    client = get_client()
    ws = client.open_by_key(SHEET_ID).worksheet("CREDENCIAMENTOS")
    rows = ws.get_all_values()

    df = pd.DataFrame(rows[1:], columns=rows[0])
    df = normalize_columns(df)

    # nomes equivalentes
    rename_map = {
        "EMPRESA": "EMPRESA CREDENCIADA",
        "SERVICOS": "SERVIÇO",
        "SERVIÇOS": "SERVIÇO",
        "N CONTRATO": "Nº CONTRATO",
        "NUMERO CONTRATO": "Nº CONTRATO",
    }
    df = df.rename(columns=rename_map)

    # limpeza geral
    df = df.replace("", pd.NA)

    # colunas que herdam valor (células mescladas)
    for col in ["EDITAL", "ESPECIALIDADE", "UNID", "EMPRESA CREDENCIADA"]:
        if col in df.columns:
            df[col] = (
                df[col]
                .ffill()
                .astype(str)
                .str.strip()
                .str.upper()
            )

    return df



def get_medicos():
    client = get_client()
    ws = client.open_by_key(SHEET_ID).worksheet("MÉDICOS HABILITADOS")
    rows = ws.get_all_values()

    df = pd.DataFrame(rows[2:], columns=rows[1])
    df = normalize_columns(df)

    df = df.rename(columns={
        "EDITAL N°": "EDITAL",
        "EDITAL Nº": "EDITAL",
        "UND": "UNID"
    })

    df = df.replace("", pd.NA)

    for col in ["EDITAL", "UNID", "EMPRESA"]:
        if col in df.columns:
            df[col] = (
                df[col]
                .ffill()
                .astype(str)
                .str.strip()
                .str.upper()
            )

    return df
