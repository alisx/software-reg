# 软著申请助手（software-reg）— Kimi Code 插件

一个辅助**计算机软件著作权（软著）登记申请**的 AI 插件。把它装进 Kimi Code 后，AI 可以分析你的软件项目目录，自动提取中国版权保护中心 R11 申请表所需的填报信息、检查材料完整性与合规性并给出整改建议、生成"主要功能/技术特点"等申请文案草稿，并把申报材料一次性导出成稿。

插件内置了从版权中心 R11 填报页抓取的逐字段官方说明（`references/`），填表时引用的规则是官方原文，不是 AI 凭印象编的。

## 功能一览

| 能力 | 触发方式 | 说明 |
|---|---|---|
| 材料准备计划 | `/software-reg:plan` | 输出材料清单、AI 代办与你必办的分工、准备顺序 |
| 差距分析 | `/software-reg:check` | 扫描项目，逐项判定是否满足交存规范，输出差距报告 |
| 填报草稿 | `/software-reg:fill` | 为申请表第 2/3/4 页逐字段给出建议填报值 + 推断依据 + 置信度 |
| 文案生成 | `/software-reg:describe` | 生成"主要功能"（500–1300 字，有下限）与"技术特点"（≤100 字）草稿并核验字数 |
| 整改执行 | `/software-reg:fix` | 把问题项整理成整改清单，**先预览、经你确认后**才动文件（如统一软件名称/版本号） |
| 材料导出 | `/software-reg:export` | check 通过后，把填报信息、功能/特点文案、源程序鉴别材料、文档草稿一次性导出到项目下的 `软著申请材料/` 目录（只写该目录，覆盖前先确认） |
| 自动顾问 | 无需命令 | 只要你聊的话题涉及软著申请，skill 会自动加载提供规范指导 |

除 `/software-reg:fix` 与 `/software-reg:export`（仅写固定导出目录）外，所有命令对你的项目**只读**，不会改任何文件。

## 安装（Kimi Code CLI）

**方式一：本地 zip 安装（推荐，本包即为此形式）**

```
/plugins install /path/to/software-reg-plugin.zip
```

**方式二：解压后从目录安装**

```
/plugins install /path/to/software-reg
```

安装后在 TUI 里执行 `/plugins reload`（或 `/new` 开个新会话）生效。可以用 `/plugins list` 确认已安装、`/plugins info software-reg` 查看详情。

说明：

- 安装是**用户级**的，对所有项目生效；插件会被复制到 `~/.kimi-code/plugins/managed/software-reg/`，之后改动原 zip/目录不影响已安装的副本（要更新就重新 install 一次）。
- 卸载：`/plugins remove software-reg`。

## 使用示例

```
# 在你要申请软著的项目目录里启动 kimi，然后：
/software-reg:plan           # 先看看要准备哪些材料、怎么分工
/software-reg:check          # 差距分析：代码量够不够、有没有 README、名称是否一致……
/software-reg:fill           # 生成整份申请表的填报草稿，逐项复制到 R11 网页
/software-reg:describe       # 单独打磨"主要功能"和"技术特点"两段文字
/software-reg:export         # 检查通过后，一键导出全部申报材料草稿到 软著申请材料/
/software-reg:fix            # 确认后自动统一名称/版本号等
```

也可以不带命令直接聊："我要给这个项目申请软著，帮我看看还缺什么"——skill 会自动触发。

## 边界与免责声明

- AI 辅助的是申请表的**第 2/3/4 步**（填字段、备材料）；**第 1 步实名认证和第 5 步确认签章必须本人完成**。
- 开发方式、著作权人、证件信息等无法从代码推断的内容，插件只会提示你准备，**不会替你编**。
- 导出的是 TXT/MD 草稿，提交要求 PDF：按导出文件里的指引转 PDF 并逐页核对行数与页眉。
- 插件内的字段规则抓取于 2026 年 9 月的 R11 页面，填报时以版权中心页面（https://register.ccopyright.com.cn/r11.html）当下显示为准。
- AI 生成的文案（功能描述、手册草稿等）请**人工改写后再提交**——版权中心已对鉴别材料做 AIGC 检测，直接提交 AI 生成文本有被判回补正的风险。
- 本插件不构成法律意见。

## 其他 AI 编程工具

插件核心 `skills/software-reg/SKILL.md` 遵循 SKILL.md 开放规范（agentskills.io），理论上可被支持该规范的其他工具读取（如 Claude Code 可将 `skills/software-reg/` 拷入其 skills 目录使用）；斜杠命令为 Kimi Code 专有格式，其他工具需自行适配。以上兼容性未逐一实测，仅供参考。

---

- 名称：software-reg（软著申请助手）
- 版本：0.4.0
- 许可：仅供学习与个人使用；官方字段说明文字版权归属中国版权保护中心
