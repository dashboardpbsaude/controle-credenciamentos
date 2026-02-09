// ======================= static/js/app.js =======================
let dados = [];

$(document).ready(function () {

    $.get("/api/credenciamentos", function (resp) {
        dados = resp;
        carregarFiltros(dados);
        renderizar(dados);
    });

    $("select").on("change", aplicarFiltros);

    $("#btnLimpar").on("click", function () {
        $("select").val(null).trigger("change");
        carregarFiltros(dados);
        renderizar(dados);
    });
});

// ======================= FILTROS =======================
function carregarFiltros(dados){
    preencher("#filtroUnid",[...new Set(dados.map(d=>d.UNID))]);
    preencher("#filtroEspecialidade",[...new Set(dados.map(d=>d.ESPECIALIDADE))]);
    preencher("#filtroStatus",[...new Set(dados.map(d=>d.STATUS))]);
}

function preencher(id, valores){
    const sel=$(id);
    sel.empty().append(`<option></option>`);
    valores.filter(Boolean).sort().forEach(v=>{
        sel.append(`<option value="${v}">${v}</option>`);
    });
}

function aplicarFiltros(){
    let f={
        unid:$("#filtroUnid").val(),
        esp:$("#filtroEspecialidade").val(),
        status:$("#filtroStatus").val()
    };

    const filtrado=dados.filter(d=>{
        const unidReg=(d.UNID||"").toUpperCase();
        const unidFil=(f.unid||"").toUpperCase();

        return (
            (!f.esp || d.ESPECIALIDADE===f.esp) &&
            (!f.status || d.STATUS===f.status) &&
            (!f.unid || unidReg.includes(unidFil))
        );
    });

    renderizar(filtrado);
}

// ======================= RENDERIZAÇÃO =======================
function formatarServico(txt){
    if(!txt) return "";
    return txt.replace(/\n/g,"<br>");
}

function getObservacao(linha){
    const chave = Object.keys(linha).find(k =>
        k.normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .toUpperCase()
         .startsWith("OBSERV")
    );
    return chave ? linha[chave] : "";
}

function renderizar(lista){
    const container=$("#accordionCred");
    container.empty();

    if(lista.length===0){
        container.html(`<div class="alert alert-warning">Nenhum registro encontrado.</div>`);
        return;
    }

    const anos={};
    lista.forEach(d=>{
        const ano=d.EDITAL?.slice(-4);
        if(!anos[ano]) anos[ano]=[];
        anos[ano].push(d);
    });

    let idxAno=0;

    Object.keys(anos).sort().forEach(ano=>{

        const grupos={};
        anos[ano].forEach(d=>{
            const k=`${d.EDITAL}|${d.ESPECIALIDADE}|${d.UNID}`;
            if(!grupos[k]){
                grupos[k]={edital:d.EDITAL,especialidade:d.ESPECIALIDADE,unid:d.UNID,linhas:[]};
            }
            grupos[k].linhas.push(d);
        });

        let htmlEditais="";
        let idxEdital=0;

        for(const k in grupos){
            const g=grupos[k];

            g.linhas.sort((a,b)=>
                (a["EMPRESA CREDENCIADA"]||"")
                    .localeCompare(b["EMPRESA CREDENCIADA"]||"","pt-BR")
            );

            let linhasHTML="";
            let ultimaEmpresa=null;
            let ultimoStatus="";

            g.linhas.forEach(l=>{
                const mesmaEmpresa = l["EMPRESA CREDENCIADA"] === ultimaEmpresa;

                let vig="";
                if(l["VIGÊNCIA INICIAL"]||l["VIGÊNCIA FINAL"]){
                    vig=`${l["VIGÊNCIA INICIAL"]||""} a ${l["VIGÊNCIA FINAL"]||""}`;
                }

                const temVigencia = (l["VIGÊNCIA INICIAL"] || l["VIGÊNCIA FINAL"]);

                let st = "";

                if (l.STATUS) {
                    st = l.STATUS;
                    ultimoStatus = l.STATUS;
                } else if (mesmaEmpresa && temVigencia) {
    st = ultimoStatus;
                }


                if(st==="VIGENTE"){
                    st=`<span style="color:green;font-weight:600">VIGENTE</span>`;
                }else if(st==="VENCIDO"){
                    st=`<span style="color:red;font-weight:600">VENCIDO</span>`;
                }

                const obsTexto = getObservacao(l) || "Nenhuma observação.";

                linhasHTML+=`
                <tr class="${mesmaEmpresa?"linha-continuacao":""}">
                    <td>${mesmaEmpresa?"...":(l["EMPRESA CREDENCIADA"]||"")}</td>
                    <td>${mesmaEmpresa?"...":formatarServico(l["SERVIÇO"])}</td>
                    <td>${l["Nº CONTRATO"]||""}</td>
                    <td>${vig}</td>
                    <td>${st}</td>
                    <td style="text-align:center">
                        <button class="btn btn-sm btn-outline-secondary btn-obs"
                                data-obs="${obsTexto}">
                            📝
                        </button>
                    </td>
                    <td style="text-align:center">
                        <button class="btn btn-sm btn-outline-primary btn-medicos"
                                data-empresa="${encodeURIComponent(l["EMPRESA CREDENCIADA"]||"")}">
                            👨‍⚕️
                        </button>
                    </td>
                </tr>`;

                ultimaEmpresa = l["EMPRESA CREDENCIADA"];
            });

            htmlEditais+=`
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed"
                        data-bs-toggle="collapse"
                        data-bs-target="#ed${idxAno}_${idxEdital}">
                        📄 ${g.edital} | ${g.especialidade} | ${g.unid}
                    </button>
                </h2>

                <div id="ed${idxAno}_${idxEdital}"
                     class="accordion-collapse collapse"
                     data-bs-parent="#accordionAno${idxAno}">
                    <div class="accordion-body">
                        <table class="table table-clean">
                            <thead>
                                <tr>
                                    <th>EMPRESA</th>
                                    <th>SERVIÇO</th>
                                    <th>Nº CONTRATO</th>
                                    <th>VIGÊNCIA</th>
                                    <th>STATUS</th>
                                    <th>OBS</th>
                                    <th>MÉDICOS</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linhasHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;

            idxEdital++;
        }

        container.append(`
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed"
                    data-bs-toggle="collapse"
                    data-bs-target="#ano${idxAno}">
                    📂 Editais ${ano}
                </button>
            </h2>

            <div id="ano${idxAno}"
                 class="accordion-collapse collapse"
                 data-bs-parent="#accordionCred">
                <div class="accordion-body p-0">
                    <div class="accordion" id="accordionAno${idxAno}">
                        ${htmlEditais}
                    </div>
                </div>
            </div>
        </div>`);

        idxAno++;
    });
}

// ======================= MODAL OBS =======================
$(document).on("click", ".btn-obs", function(){
    $("#conteudoObservacoes").text(
        $(this).data("obs") || "Nenhuma observação."
    );
    new bootstrap.Modal(
        document.getElementById("modalObservacoes")
    ).show();
});

// ======================= MODAL MÉDICOS =======================
$(document).on("click", ".btn-medicos", function(){
    const empresa = $(this).data("empresa");
    const tbody = $("#tbodyMedicos");

    tbody.html(`
        <tr>
            <td colspan="3" class="text-center text-muted">
                Nenhum médico encontrado.
            </td>
        </tr>
    `);

    const modal = new bootstrap.Modal(
        document.getElementById("modalMedicos")
    );
    modal.show();

    $.get("/api/medicos", { empresa: empresa }, function(resp){
        tbody.empty();

        if(!resp || resp.length === 0){
            tbody.append(`
                <tr>
                    <td colspan="3" class="text-center text-muted">
                        Nenhum médico encontrado.
                    </td>
                </tr>
            `);
        }else{
            resp.forEach(m=>{
                tbody.append(`
                    <tr>
                        <td>${m.PROFISSIONAL || ""}</td>
                        <td>${m.CRM || ""}</td>
                        <td>${m.RQE || ""}</td>
                    </tr>
                `);
            });
        }
    });
});
