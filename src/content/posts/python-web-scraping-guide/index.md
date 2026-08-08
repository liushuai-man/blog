---
title: 用 Python 写一个简单的网页爬虫
published: 2026-08-02
description: '从 HTTP 请求、网页解析到数据保存，循序渐进地完成一个 Python 爬虫，并说明爬取数据时需要遵守的边界。'
tags: ['Python', '爬虫', 'HTTP', 'BeautifulSoup']
category: python
draft: false
---

如果把网页看成一本放在网上的书，爬虫做的事情就是：自动翻开这本书，找到需要的内容，再把它们整理好保存下来。

这篇文章不追求复杂的爬虫框架，而是从一次最基本的 HTTP 请求开始，写一个能翻页、能解析、能保存结果的小爬虫。示例网站使用专门供学习者练习的 [Quotes to Scrape](https://quotes.toscrape.com/)，适合第一次动手。

## 一、爬虫简介

### 1. 什么是爬虫

网络爬虫（Web Crawler）是一段按照一定规则访问网页并提取信息的程序。

我们平时打开网页时，是人在浏览器里点击链接、阅读内容；爬虫则把这些重复操作交给程序完成。例如：

- 收集公开的文章标题，做个人阅读清单；
- 获取公开数据，用于统计和研究；
- 定期检查自己网站的链接是否失效；
- 为搜索功能建立索引。

爬虫只是获取信息的一种工具。它能做什么，不等于我们就可以随意抓取什么，使用时必须考虑网站规则、数据隐私和法律边界。

### 2. 爬虫是怎样工作的

爬虫和浏览器访问网页的底层过程很相似：

1. 向一个 URL 发出 HTTP 请求；
2. 服务器处理请求并返回 HTTP 响应；
3. 程序读取响应中的 HTML 或 JSON；
4. 从响应里定位并提取需要的数据；
5. 保存数据，或者找到下一页链接继续访问。

HTTP 是客户端和服务器之间传递信息的一套规则。一次 HTTP 请求通常包含请求方法、地址、请求头和请求体。爬虫最常使用 `GET` 方法获取页面。服务器返回的响应则包含状态码、响应头和响应体。

常见状态码有：

| 状态码 | 含义 | 程序应该怎么做 |
| --- | --- | --- |
| `200` | 请求成功 | 解析响应内容 |
| `301` / `302` | 页面重定向 | 确认最终跳转地址 |
| `403` | 拒绝访问 | 停止请求并检查网站规则，不要绕过限制 |
| `404` | 页面不存在 | 记录并跳过 |
| `429` | 请求过于频繁 | 降低频率，必要时停止任务 |
| `500` | 服务器内部错误 | 稍后有限次数重试 |

### 3. 开始之前需要注意什么

写爬虫前，至少要确认下面几件事：

- **优先使用官方 API。** 如果网站提供公开 API，API 通常比解析网页稳定，也更符合网站的使用方式。
- **阅读网站规则。** 查看服务条款和网站根目录下的 `robots.txt`。`robots.txt` 表达网站对自动抓取的约定，但它不是法律授权书；即使没有禁止，也不能忽略法律和服务条款。
- **控制访问频率。** 不要在短时间内发送大量请求。设置请求间隔、超时和有限重试，避免给服务器增加不必要的压力。
- **不要绕过保护措施。** 遇到登录、验证码、访问控制或反爬限制时，不应尝试绕过。
- **保护敏感信息。** 不收集账号密码、身份证号、手机号、精确位置等个人敏感信息，也不要把 Cookie、Token、代理账号等秘密直接写进代码或提交到仓库。
- **确认数据用途合法。** 公开可见不代表可以任意复制、传播或商用。涉及个人信息、版权内容、商业数据时，应先获得明确授权，并遵守所在地法律法规。

本文只抓取练习网站公开展示的名言、作者和标签，并且主动放慢请求速度。

## 二、实现一个爬虫

### 1. 准备环境和需要的库

本文使用 Python 3，以及两个常用的第三方库：

- `requests`：发送 HTTP 请求；
- `beautifulsoup4`：解析 HTML，并从页面中查找元素。

在终端中安装：

```bash
python -m pip install requests beautifulsoup4
```

案例的入口地址是：

```text
https://quotes.toscrape.com/
```

这里不需要密钥，也不需要登录。正式项目如果有官方 API，应先阅读 API 文档，确认请求地址、认证方式、参数、响应格式、调用限额和错误码。

### 2. 第一步：请求网页

先试着获取首页：

```python
import requests

url = "https://quotes.toscrape.com/"

response = requests.get(
    url,
    headers={"User-Agent": "LearningCrawler/1.0 (personal study)"},
    timeout=10,
)
response.raise_for_status()

print(response.status_code)
print(response.url)
print(response.text[:200])
```

`timeout=10` 表示最多等待 10 秒，避免网络异常时程序一直卡住。`raise_for_status()` 会在响应为 `4xx` 或 `5xx` 时抛出异常，防止我们把错误页面当成正常数据继续处理。

请求头里的 `User-Agent` 用来说明客户端身份。这里使用清楚、诚实的名字，不伪装成浏览器，也不把邮箱、Token 等敏感信息放进去。

### 3. 第二步：解析需要的数据

打开练习网站并检查 HTML，可以看到每条名言都在一个 `class="quote"` 的元素里。其中：

- `.text` 是名言内容；
- `.author` 是作者；
- `.tag` 是标签。

用 Beautiful Soup 解析它们：

```python
from bs4 import BeautifulSoup

soup = BeautifulSoup(response.text, "html.parser")

for item in soup.select(".quote"):
    text = item.select_one(".text").get_text(strip=True)
    author = item.select_one(".author").get_text(strip=True)
    tags = [tag.get_text(strip=True) for tag in item.select(".tag")]

    print(author, text, tags)
```

`select()` 会返回所有匹配的元素，`select_one()` 只返回第一个匹配项。CSS 选择器直观好用，但网页结构变化后可能失效，因此实际项目要检查元素是否存在，而不是默认它永远不变。

### 4. 第三步：处理翻页

首页只展示一部分数据。页面底部的 `.next a` 指向下一页，可以不断读取它，直到找不到下一页为止：

```python
from urllib.parse import urljoin

next_link = soup.select_one(".next a")

if next_link:
    next_url = urljoin(response.url, next_link["href"])
    print("下一页：", next_url)
```

`urljoin()` 能把 `/page/2/` 这样的相对地址转换为完整 URL，比手动拼接字符串可靠。

### 5. 怎样验证爬虫是否成功

不要只看“程序没有报错”，还应该验证结果：

1. **检查响应。** 状态码应为 `200`，最终 URL 和响应类型应符合预期。
2. **检查提取数量。** 每一页都应该提取到数据；如果突然得到 0 条，可能是页面结构变了，也可能拿到了错误页。
3. **抽样对照。** 随机挑几条结果，与网页中显示的文字、作者和标签进行比较。
4. **检查关键字段。** 作者或正文不应为空，URL 应属于预期域名。
5. **检查重复数据。** 多页抓取时，可以用正文和作者组成唯一标识，判断是否重复进入同一页。
6. **检查输出文件。** 确认 CSV 或 JSON 能正常打开，中文没有乱码，字段数量一致。

开发时可以加一些简单断言，让异常尽早暴露：

```python
assert response.status_code == 200
assert soup.title is not None
assert soup.select(".quote"), "页面中没有找到名言，HTML 结构可能已经变化"
```

### 6. 常见的数据处理方案

爬到的原始文字往往还不能直接使用，通常需要经过以下处理：

- **清洗文本：** 去掉首尾空格、多余换行和不可见字符；
- **结构化：** 把内容整理成字典，例如 `text`、`author`、`tags`；
- **去重：** 根据唯一 ID，或关键字段的组合去掉重复记录；
- **类型转换：** 把日期、价格、数量从字符串转换成合适的类型；
- **缺失值处理：** 对找不到的字段使用 `None`，并记录异常，而不是让整个任务崩溃；
- **保存结果：** 少量数据可以保存为 JSON 或 CSV，数据量较大、需要查询时可以写入 SQLite 等数据库。

JSON 能保留列表和嵌套结构，适合程序继续处理；CSV 适合表格查看，但标签列表需要先拼接成字符串。不要未经处理就把外部文本拼进 SQL、HTML 或命令中，输出到其他系统前还要做对应的转义或参数化处理。

下面用一组简单的原始数据演示这些操作：

```python
raw_rows = [
    {
        "text": "  学而不思则罔。\n",
        "author": "孔子",
        "tags": ["学习", "思考"],
        "published_at": "2026-08-02",
        "likes": "128",
    },
    {
        "text": "学而不思则罔。",
        "author": "孔子",
        "tags": ["学习", "思考"],
        "published_at": "2026-08-02",
        "likes": "128",
    },
    {
        "text": "  知之为知之，不知为不知。  ",
        "author": "",
        "tags": [],
        "published_at": "",
        "likes": "未知",
    },
]
```

#### 文本清洗与结构化

这里用 `split()` 配合 `join()` 去掉首尾空格，并把连续的空白字符整理成一个空格。每条数据最终都变成字段一致的字典：

```python
def clean_text(value: str) -> str:
    return " ".join(value.split())


cleaned_rows = []

for row in raw_rows:
    cleaned_rows.append(
        {
            "text": clean_text(row.get("text", "")),
            "author": clean_text(row.get("author", "")) or None,
            "tags": row.get("tags", []),
            "published_at": row.get("published_at") or None,
            "likes": row.get("likes"),
        }
    )
```

使用 `row.get()` 而不是 `row["author"]`，可以避免字段不存在时直接抛出 `KeyError`。不过，缺失字段是否允许为空，仍然应该根据实际业务决定。

#### 去重

如果数据没有唯一 ID，可以暂时用多个关键字段组成唯一标识。下面把正文和作者相同的数据视为重复数据：

```python
unique_rows = []
seen = set()

for row in cleaned_rows:
    unique_key = (row["text"], row["author"])

    if unique_key in seen:
        continue

    seen.add(unique_key)
    unique_rows.append(row)
```

实际项目中，优先使用网站或 API 提供的稳定 ID。标题或正文可能被修改，只依靠文字去重并不总是可靠。

#### 类型转换与缺失值处理

网页里的日期和数字通常都是字符串。转换时需要考虑空值和异常值，不能直接假定数据一定正确：

```python
from datetime import datetime


def parse_date(value: str | None):
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_integer(value: str | None):
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


for row in unique_rows:
    row["published_at"] = parse_date(row["published_at"])
    row["likes"] = parse_integer(row["likes"])

    if row["author"] is None:
        row["author"] = "未知作者"
```

这里把无法识别的日期和点赞数处理为 `None`，而不是偷偷改成 `0`。`0` 是一个有效数值，和“数据缺失”不是同一件事。

#### 保存为 JSON 和 CSV

保存 JSON 前，要把 `date` 转换成字符串，否则 `json.dump()` 无法直接序列化：

```python
import csv
import json


output_rows = [
    {
        **row,
        "published_at": (
            row["published_at"].isoformat() if row["published_at"] else None
        ),
    }
    for row in unique_rows
]

with open("result.json", "w", encoding="utf-8") as file:
    json.dump(output_rows, file, ensure_ascii=False, indent=2)

with open("result.csv", "w", encoding="utf-8-sig", newline="") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=["text", "author", "tags", "published_at", "likes"],
    )
    writer.writeheader()

    for row in output_rows:
        writer.writerow({**row, "tags": ",".join(row["tags"])})
```

CSV 使用 `utf-8-sig` 编码，是为了让部分表格软件打开中文时更容易正确识别编码。

#### 保存到 SQLite

当数据较多，或者需要按作者、日期等条件查询时，可以使用 Python 自带的 SQLite。SQL 中的值要通过参数传入，不要用字符串拼接：

```python
import sqlite3


with sqlite3.connect("quotes.db") as connection:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS quotes (
            text TEXT NOT NULL,
            author TEXT,
            tags TEXT,
            published_at TEXT,
            likes INTEGER,
            UNIQUE(text, author)
        )
        """
    )

    connection.executemany(
        """
        INSERT OR IGNORE INTO quotes
            (text, author, tags, published_at, likes)
        VALUES (?, ?, ?, ?, ?)
        """,
        [
            (
                row["text"],
                row["author"],
                json.dumps(row["tags"], ensure_ascii=False),
                row["published_at"],
                row["likes"],
            )
            for row in output_rows
        ],
    )
```

`?` 是参数占位符，SQLite 会负责安全地处理值。这样既能正确保存引号等特殊字符，也能避免 SQL 注入问题。

### 7. 完整案例代码

下面把请求、解析、翻页、限速、去重和保存组合起来。将代码保存为 `crawler.py` 后运行即可：

```python
import csv
import json
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


START_URL = "https://quotes.toscrape.com/"
ALLOWED_HOST = "quotes.toscrape.com"
REQUEST_INTERVAL = 1


def fetch_page(session: requests.Session, url: str) -> requests.Response:
    """请求一个页面，并对网络错误给出清楚的提示。"""
    if urlparse(url).hostname != ALLOWED_HOST:
        raise ValueError(f"拒绝访问预期域名之外的地址：{url}")

    response = session.get(url, timeout=10)
    response.raise_for_status()
    return response


def parse_page(html: str) -> tuple[list[dict], str | None]:
    """解析当前页面的数据和下一页地址。"""
    soup = BeautifulSoup(html, "html.parser")
    results = []

    for item in soup.select(".quote"):
        text_node = item.select_one(".text")
        author_node = item.select_one(".author")

        if text_node is None or author_node is None:
            print("跳过一条字段不完整的数据")
            continue

        results.append(
            {
                "text": text_node.get_text(strip=True),
                "author": author_node.get_text(strip=True),
                "tags": [node.get_text(strip=True) for node in item.select(".tag")],
            }
        )

    next_node = soup.select_one(".next a")
    next_path = next_node.get("href") if next_node else None
    return results, next_path


def save_json(rows: list[dict], filename: str) -> None:
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(rows, file, ensure_ascii=False, indent=2)


def save_csv(rows: list[dict], filename: str) -> None:
    with open(filename, "w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["text", "author", "tags"])
        writer.writeheader()
        for row in rows:
            writer.writerow({**row, "tags": ",".join(row["tags"])})


def main() -> None:
    session = requests.Session()
    session.headers.update(
        {"User-Agent": "LearningCrawler/1.0 (personal study)"}
    )

    current_url = START_URL
    all_quotes = []
    seen = set()
    page_number = 0

    while current_url:
        page_number += 1
        print(f"正在抓取第 {page_number} 页：{current_url}")

        try:
            response = fetch_page(session, current_url)
        except requests.RequestException as error:
            print(f"请求失败，任务停止：{error}")
            break

        rows, next_path = parse_page(response.text)
        if not rows:
            print("当前页面没有解析到数据，任务停止")
            break

        for row in rows:
            unique_key = (row["text"], row["author"])
            if unique_key not in seen:
                seen.add(unique_key)
                all_quotes.append(row)

        current_url = urljoin(response.url, next_path) if next_path else None
        if current_url:
            time.sleep(REQUEST_INTERVAL)

    save_json(all_quotes, "quotes.json")
    save_csv(all_quotes, "quotes.csv")
    print(f"完成，共保存 {len(all_quotes)} 条数据")


if __name__ == "__main__":
    main()
```

运行命令：

```bash
python crawler.py
```

成功后，终端会打印抓取进度，当前目录会出现 `quotes.json` 和 `quotes.csv`。可以打开文件抽查几条记录，也可以再次运行程序，确认结果数量稳定且没有重复。

这个案例为了容易理解，只在网络错误时停止任务。更正式的任务还可以加入日志、持久化进度和有限次数重试，但不要对 `403`、`429` 等响应盲目重试，更不能把“绕过限制”当成稳定性方案。

## 三、总结

一个基础爬虫的核心流程并不复杂：发送 HTTP 请求、检查响应、解析网页、清洗数据、处理翻页，最后保存结果。真正需要认真对待的，除了代码是否能跑，还有访问频率、错误处理、数据质量和使用边界。

第一次写爬虫时，可以先从结构稳定、明确允许练习的网站开始，只抓一页，再逐步加入翻页、去重和保存。等这些基本环节都能验证无误后，再考虑更大的数据量或更复杂的工程结构。

最后再强调一次：技术只是手段。尊重网站规则，不采集敏感信息，不绕过访问控制，并确保用途合法，才是写爬虫最重要的前提。
