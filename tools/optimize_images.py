#!/usr/bin/env python3
"""
Otimiza as fotos do Ateliê Nilda Castanho e gera o HTML da galeria.

Uso:
    python3 tools/optimize_images.py <pasta-com-as-fotos-originais>

- Recorta faixas pretas (stories do Instagram).
- NUNCA aumenta a resolução: se a foto original é pequena, ela é mantida pequena.
- Gera assets/img/gallery/<chave>-sm.webp (miniatura) e <chave>-lg.webp (ampliação).
- Gera tools/gallery.generated.html (itens da galeria, para copiar e colar no index.html).
Requer Pillow (pip install pillow).
"""
import sys, glob, os, json
from PIL import Image, ImageChops

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "img")

def find(prefix):
    hits = [f for f in glob.glob(os.path.join(SRC, "**", "*"), recursive=True)
            if os.path.basename(f).startswith(prefix)]
    if not hits:
        raise SystemExit(f"Foto não encontrada: {prefix}")
    return hits[0]

def autocrop(im, thr=16):
    """Remove faixas pretas (letterbox) nas bordas."""
    g = im.convert("L")
    bg = Image.new("L", g.size, 0)
    mask = g.point(lambda p: 255 if p > thr else 0)
    box = mask.getbbox()
    if box:
        l, t, r, b = box
        # só corta se a faixa for relevante (>3% da altura/largura)
        if (t > im.height * .03) or (im.height - b > im.height * .03) or (l > im.width * .03) or (im.width - r > im.width * .03):
            return im.crop(box)
    return im

def save(im, path, maxw, q):
    w, h = im.size
    if w > maxw:
        im = im.resize((maxw, round(h * maxw / w)), Image.LANCZOS)
    im.save(path, "WEBP", quality=q, method=6)
    return im.size

# chave, prefixo do arquivo, categorias, legenda/alt
G = [
 # --- noivas
 ("noiva-cauda",    "731350569", "noivas",        "Vestido de noiva em cetim com cauda longa, visto de costas"),
 ("noiva-veu",      "893468807", "noivas",        "Noiva com vestido de ombros caídos e véu de tule, segurando buquê"),
 # --- vestidos em geral
 ("vestido-festa-preto", "503329115", "vestidos", "Vestido de festa longo preto em cetim, com fenda"),
 ("vestido-terracota",   "491458428", "vestidos", "Vestido de saia ampla em tom terracota"),
 ("vestido-amarelo",     "521262488", "vestidos", "Vestido amarelo com mangas bufantes diante de arranjo de flores"),
 ("vestido-azul",        "521907933", "vestidos", "Vestido azul-marinho com mangas em tule"),
 ("vestido-amarelo-corredor", "522238715", "vestidos", "Vestido amarelo longo em cerimônia ao ar livre"),
 # --- vestidos infantis
 ("infantil-minnie",     "467703641", "infantis",  "Vestido infantil vermelho de bolinhas com corpete preto"),
 ("infantil-daminha",    "503367357", "infantis",  "Vestido branco de daminha com saia de tule e capa"),
 ("infantil-borboletas", "656649038", "infantis",  "Vestido infantil branco com aplicações de borboletas"),
 ("infantil-verde-agua", "510935111", "infantis",  "Vestido infantil verde-água com aplicações em relevo"),
 ("infantil-xadrez",     "506067507", "infantis",  "Vestido infantil xadrez vermelho com gola branca"),
 ("infantil-bebe",       "534823505", "infantis",  "Vestido de bebê com saia de tule amarela e laço vermelho"),
 ("infantil-cetim-azul", "503998071", "infantis",  "Vestido infantil de cetim azul com estrelas e laço vermelho"),
 ("infantil-renda",      "731052071", "infantis",  "Vestido infantil com renda e aplicações delicadas"),
 # --- macacões
 ("macacao-azul",   "522390820", "macacoes",      "Macacão infantil felpudo azul com capuz"),
 ("macacao-aranha", "523416158", "macacoes",      "Macacão infantil estampado com capuz"),
 # --- jardim encantado
 ("jardim-verde-cabide", "780158480", "jardim",   "Tutu de ballet verde com bordados e pérolas, no cabide"),
 ("jardim-rosa",         "780649423", "jardim",   "Tutu de ballet rosa com corpete bordado"),
 ("jardim-dourado",      "782018204", "jardim",   "Tutu de ballet amarelo com corpete vinho e dourado"),
 ("jardim-azul-prata",   "790208457", "jardim",   "Figurino de ballet azul e prata no cabide"),
 ("jardim-palco",        "789950039", "jardim",   "Bailarina com tutu de tule verde em cena"),
 ("jardim-verde-ninho",  "820155659", "jardim",   "Criança com ballet em tule verde-musgo"),
 ("jardim-espetaculo",   "503606930", "jardim",   "Grupo de bailarinas em apresentação no palco"),
 ("encanto-capa",        "row-1-column-1.jpg", "jardim", "Arte da Coleção Encanto com selo e tutus de ballet"),
 ("encanto-azul",        "row-1-column-2.jpg", "jardim", "Tutu azul e prateado da Coleção Encanto"),
 ("encanto-dourado",     "row-1-column-3.jpg", "jardim", "Tutu amarelo com corpete vinho da Coleção Encanto"),
 ("encanto-rosa",        "row-1-column-4.jpg", "jardim", "Tutu rosa com paetês da Coleção Encanto"),
 ("encanto-musgo",       "row-1-column-5.jpg", "jardim", "Tutu verde-musgo da Coleção Encanto"),
 ("encanto-verde",       "row-1-column-6.jpg", "jardim", "Tutu verde-claro bordado da Coleção Encanto"),
 # --- uniformes
 ("uniforme-vinho",  "819470237", "uniformes",    "Uniforme social em tom vinho: colete e saia"),
 ("uniforme-azul",   "877604851", "uniformes",    "Uniforme azul-marinho com lenço vermelho e boina"),
 ("uniforme-azul-2", "880459033", "uniformes",    "Uniforme azul-marinho com lenço vermelho, diante de balões coloridos"),
 # --- sublimação
 ("sublimacao-camiseta", "472828938", "sublimacao", "Camiseta com estampa personalizada por sublimação"),
 ("sublimacao-almofada", "469719133", "sublimacao", "Almofada personalizada com fotos e mensagem por sublimação"),
 # --- outras costuras
 ("outras-casaco",  "504599239", "outras",        "Casaco teddy rosa com forro felpudo"),
 ("outras-manta",   "505472844", "outras",        "Manta e toalhinhas de bebê com nome bordado"),
]

# imagens do site (não entram na galeria): chave, prefixo, caixa de recorte opcional, largura máx
S = [
 ("hero-noiva",  "731350569", None, 1100),
 ("hero-verde",  "820155659", None, 900),
 ("hero-dourado","782018204", None, 640),
 ("sobre-xadrez","506067507", None, 700),
 ("sobre-manta", "505472844", None, 600),
 ("detalhe-bordado", "row-1-column-6.jpg", (330, 820, 1830, 2320), 1100),
 ("detalhe-paete",   "row-1-column-4.jpg", (360, 900, 1860, 2400), 800),
]
os.makedirs(os.path.join(OUT, "gallery"), exist_ok=True)
os.makedirs(os.path.join(OUT, "site"), exist_ok=True)

items = []
for key, pre, cats, alt in G:
    im = autocrop(Image.open(find(pre)).convert("RGB"))
    lg = save(im, f"{OUT}/gallery/{key}-lg.webp", 1400, 80)
    if im.width > 700:
        sm = save(im, f"{OUT}/gallery/{key}-sm.webp", 640, 76)
        small = f"{key}-sm.webp"
    else:
        small, sm = f"{key}-lg.webp", lg
    items.append((key, cats, alt, small, sm, f"{key}-lg.webp"))
    print(f"gallery {key:26s} src={im.size} lg={lg} sm={sm}")

html = []
for key, cats, alt, small, sm, big in items:
    html.append(
f'''      <li class="g-item" data-cat="{cats}">
        <button type="button" class="g-open" data-full="assets/img/gallery/{big}" data-caption="{alt}" aria-label="Ampliar foto: {alt}">
          <img src="assets/img/gallery/{small}" width="{sm[0]}" height="{sm[1]}" alt="{alt}" loading="lazy" decoding="async">
        </button>
      </li>''')
open(os.path.join(ROOT, "tools", "gallery.generated.html"), "w").write("\n".join(html) + "\n")

dims = {}
for key, pre, box, maxw in S:
    im = Image.open(find(pre)).convert("RGB")
    if box: im = im.crop(box)
    else: im = autocrop(im)
    dims[key] = save(im, f"{OUT}/site/{key}.webp", maxw, 80)
print(json.dumps(dims, indent=1))
