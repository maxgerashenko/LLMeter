# Trillion-dollar companies: jobs, margins and what comes back to the US economy

*Written 2026-11-20. All sources read on 2026-11-20. Data file: [data/trillion-companies-2026-11-20.csv](../data/trillion-companies-2026-11-20.csv). Prompts behind this article: [prompts/trillion-companies-jobs-2026-11-20.md](../prompts/trillion-companies-jobs-2026-11-20.md). Website page: [Finance > Jobs](https://maxgerashenko.github.io/LLMeter/jobs.html).*

## Summary

The question: do the largest companies distort the economy by moving a lot of money and keeping a large margin while employing few people? The idea is to count employees against the company's size, and use that as an index of how much the company gives back through work, not only through profit and tax.

What the data shows for the 13 US-listed companies worth more than $1 trillion (Anthropic joined them on 2026-11-19, its first day of trading):

- Together they are worth $30.8 trillion, earn $1.08 trillion of net profit a year on $4.12 trillion of revenue (a 26% net margin) and employ 5.0 million people worldwide. Anthropic's net result is not counted in the profit, see the note under the data table. For scale, US payrolls hold 159.3 million jobs.
- **Jobs and value have come apart.** Walmart alone has 42% of the group's jobs with 2% of its profit. Nvidia, SpaceX, Broadcom and Anthropic together have 2% of the jobs with 21% of the profit and 28% of the value.
- **The gap between the ends is several hundred times.** Ford has about 3,660 jobs per $1 billion of market value, Nvidia about 11, Anthropic about 4.
- **Estimate:** paying 10% of the group's profit as wages would fund about 1.1 million average US jobs. The extra federal tax would be small ($6 billion to $19 billion a year). The real change would be who receives the money.
- **The hypothesis is half supported.** The data shows very large profit with very few jobs at one end. It does not show that this harms the economy: that needs data this article does not have (see [Limits](#limits)).

## The index

**Jobs per $1 billion of market value** = employees / market value in billions of dollars.

It reads the same way for every company: how many people have work for each $1 billion that investors say the company is worth. The inverse is market value per employee. Two more numbers sit beside it: revenue per employee and net profit per employee.

**Margin** in this article always means the **net profit margin** (net margin): net profit divided by revenue. It is the last margin, what is left as profit after all costs, interest and tax.

Companies are grouped into four tiers by this index, with the same tier colours as the rest of the site. Tier 1 gives the least work for its size and Tier 4 the most. Tables go from Tier 1 down to Tier 4.

| Tier | Jobs per $1 billion of market value |
| --- | --- |
| **Tier 1** | fewer than 30 |
| **Tier 2** | 30 to 100 |
| **Tier 3** | 100 to 1,000 |
| **Tier 4** | 1,000 or more |

The tier edges are this article's own choice. They are set where the data has gaps.

## Which companies

The list is every US-listed company with a market value above $1 trillion on the [StockAnalysis list of biggest companies](https://stockanalysis.com/list/biggest-companies/) as read on 2026-11-20, checked against [The Motley Fool's November 2026 list](https://www.fool.com/research/largest-companies-by-market-cap/). That gives 12 companies. Anthropic is the 13th: it began trading on Nasdaq on 2026-11-19 (ticker ANT) and is not yet on either list. Its market value here is its first-day closing price of $97.17 times the 13.1 billion implied shares outstanding that [Yahoo Finance](https://finance.yahoo.com/markets/live/stock-market-today-thursday-november-19-dow-sp-500-nasdaq-anthropic-ipo-live-141306032.html) counts, which gives about $1.27 trillion. Yahoo Finance reports about $1.5 trillion on a fully diluted basis at the IPO price of $83. Berkshire Hathaway is not in the top rows of the StockAnalysis list but is at $1.26 trillion on its own page and $1.2 trillion on the Motley Fool list, so it is included.

Not included: Taiwan Semiconductor ($1.85 trillion) and Saudi Aramco ($1.69 trillion), which are not US companies, and Samsung, which is just under or over $1 trillion depending on the day.

Four companies below $1 trillion are added for contrast: Ford and General Motors (many employees, low margin), JPMorgan Chase (the largest US company under the line) and ExxonMobil (old-economy company with few employees).

## The data

All numbers are for the last 12 months as shown on each company's StockAnalysis statistics page (updated between 2026-10-27 and 2026-11-18). Employees are the worldwide count from the latest annual report. The last four columns are calculated here.

| Tier | Company | Market value | Employees | Revenue | Net profit | Net margin | Jobs per $1B of value | Revenue per employee | Net profit per employee |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | [Anthropic](https://finance.yahoo.com/markets/live/stock-market-today-thursday-november-19-dow-sp-500-nasdaq-anthropic-ipo-live-141306032.html) | $1.27T | 5,300 | $35.3B | not counted | -557% | 4.2 | $6.65M | not counted |
| 1 | [Nvidia](https://stockanalysis.com/stocks/nvda/statistics/) | $3.75T | 42,000 | $303.0B | $192.9B | 63.7% | 11.2 | $7.21M | $4.59M |
| 1 | [SpaceX](https://stockanalysis.com/stocks/spcx/statistics/) | $1.89T | 22,000 | $32.0B | -$3.4B | -8.6% | 11.6 | $1.46M | -$156K |
| 1 | [Broadcom](https://stockanalysis.com/stocks/avgo/statistics/) | $1.66T | 33,000 | $89.1B | $38.3B | 42.9% | 19.9 | $2.70M | $1.16M |
| 2 | [Apple](https://stockanalysis.com/stocks/aapl/statistics/) | $5.18T | 167,000 | $478.8B | $132.2B | 27.6% | 32.2 | $2.87M | $791K |
| 2 | [Eli Lilly](https://stockanalysis.com/stocks/lly/statistics/) | $1.29T | 50,000 | $86.5B | $27.6B | 31.9% | 38.8 | $1.73M | $552K |
| 2 | [Meta](https://stockanalysis.com/stocks/meta/statistics/) | $1.64T | 66,775 | $241.6B | $75.3B | 31.2% | 40.7 | $3.62M | $1.13M |
| 2 | [Alphabet (Google)](https://stockanalysis.com/stocks/googl/statistics/) | $3.64T | 204,757 | $471.1B | $235.7B | 50.0% | 56.3 | $2.30M | $1.15M |
| 2 | [Microsoft](https://stockanalysis.com/stocks/msft/statistics/) | $3.76T | 223,000 | $346.5B | $142.6B | 41.2% | 59.3 | $1.55M | $640K |
| 2 | [Tesla](https://stockanalysis.com/stocks/tsla/statistics/) | $1.54T | 134,785 | $103.6B | $3.2B | 3.1% | 87.5 | $768K | $24K |
| 3 | [Berkshire Hathaway](https://stockanalysis.com/stocks/brk.b/statistics/) | $1.26T | 387,800 | $395.4B | $77.1B | 19.5% | 308 | $1.02M | $199K |
| 3 | [Amazon](https://stockanalysis.com/stocks/amzn/statistics/) | $2.88T | 1,576,000 | $797.5B | $134.8B | 16.9% | 547 | $506K | $86K |
| 4 | [Walmart](https://stockanalysis.com/stocks/wmt/statistics/) | $1.02T | 2,100,000 | $735.8B | $22.1B | 3.0% | 2,059 | $350K | $11K |
| | **All 13** | **$30.78T** | **5,012,417** | **$4,116.1B** | **$1,078.2B** | **26.4%** | **163** | **$821K** | **$215K** |

The net profit and net margin in the total row cover the 12 companies other than Anthropic.

Contrast companies, below $1 trillion:

| Tier | Company | Market value | Employees | Revenue | Net profit | Net margin | Jobs per $1B of value | Revenue per employee | Net profit per employee |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | [ExxonMobil](https://stockanalysis.com/stocks/xom/statistics/) | $676.6B | 58,000 | $388.2B | $40.6B | 10.5% | 85.7 | $6.69M | $700K |
| 3 | [JPMorgan Chase](https://stockanalysis.com/stocks/jpm/statistics/) | $919.4B | 322,964 | $190.7B | $64.5B | 34.6% | 351 | $591K | $200K |
| 4 | [General Motors](https://stockanalysis.com/stocks/gm/statistics/) | $72.6B | 156,000 | $187.0B | $3.9B | 2.1% | 2,150 | $1.20M | $25K |
| 4 | [Ford](https://stockanalysis.com/stocks/f/statistics/) | $46.2B | 169,000 | $188.0B | -$7.4B | -3.9% | 3,660 | $1.11M | -$44K |

Notes on single rows:

- **Alphabet.** The net margin (50.0%) is above its margin on operations alone (33.3%), so the profit includes large gains from outside the main business. The page read does not break them down.
- **SpaceX and Ford** made a net loss over the last 12 months.
- **Anthropic** listed on 2026-11-19. Its market value is one day old and calculated here from the closing price and Yahoo Finance's share count, so it is the least firm number in the table. Its revenue is the 12 months to 2026-09-30 and its staff count is from 2026-09-30, all from its [Form S-1](https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm) as recorded in [data/anthropic-s1-2026-10-26.csv](../data/anthropic-s1-2026-10-26.csv). Its net margin of -557% is the reported one for the 12 months to 2026-06-30: a net loss of $109.7 billion on revenue of $19.7 billion ([StockAnalysis](https://stockanalysis.com/stocks/ant/statistics/)). Most of that loss is a non-cash change in the value of convertible notes, so it is not counted in the group's profit total. From operations alone, the first half of 2026 was close to zero (-$693 million on $16,286 million of revenue).

## The tiers, and one competition in each

Shares are of the 13 companies above $1 trillion. Profit shares are of the 12 with a profit figure.

| Tier | Companies | Share of jobs | Share of net profit | Share of market value |
| --- | --- | ---: | ---: | ---: |
| 1 | Broadcom, SpaceX, Nvidia, Anthropic | 2.0% (102,300) | 21.1% ($228B) | 27.8% ($8.57T) |
| 2 | Tesla, Microsoft, Alphabet, Meta, Eli Lilly, Apple | 16.9% (846,317) | 57.2% ($617B) | 55.4% ($17.05T) |
| 3 | Amazon, Berkshire Hathaway | 39.2% (1,963,800) | 19.6% ($212B) | 13.4% ($4.14T) |
| 4 | Walmart | 41.9% (2,100,000) | 2.0% ($22B) | 3.3% ($1.02T) |

Tiers 1 and 2 together hold 83% of the value and 78% of the profit with 19% of the jobs.

### Margin tiers

The profit margin has its own four tiers, separate from the job tiers. Tier 1 is the highest margin. The edges are this article's own choice.

For most companies the margin is the net profit margin. For three young companies that spend heavily on research (SpaceX, Anthropic and Tesla) the tier uses the **margin before R&D**: profit from operations with research and development spending added back, divided by revenue. It shows what the business earns before it invests in new products. It is not directly comparable with a net margin, because it also leaves out interest, tax and one-off items, so these three are marked with a star.

| Margin tier | Margin | Companies, highest margin first |
| --- | --- | --- |
| **Tier 1** | 40% or more | Nvidia (63.7%), Alphabet (50.0%), SpaceX* (43.8%), Broadcom (42.9%), Microsoft (41.2%) |
| **Tier 2** | 20% to 40% | Anthropic* (38.6%), JPMorgan Chase (34.6%), Eli Lilly (31.9%), Meta (31.2%), Apple (27.6%) |
| **Tier 3** | 5% to 20% | Berkshire Hathaway (19.5%), Amazon (16.9%), Tesla* (11.6%), ExxonMobil (10.5%) |
| **Tier 4** | less than 5%, or a net loss | Walmart (3.0%), General Motors (2.1%), Ford (-3.9%) |

\* Margin before R&D, calculated here:

| Company | Period | Revenue | Profit from operations | R&D spending | Margin from operations | R&D share of revenue | Margin before R&D | Net margin | Source |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SpaceX | 12 months to 2026-09-30 | $32,043M | $575M | $13,473M | 1.8% | 42.0% | 43.8% | -8.6% | [StockAnalysis income statement](https://stockanalysis.com/stocks/spcx/financials/income-statement/) |
| Anthropic | 12 months to 2026-06-30 | $19,708M | -$6,618M | $14,229M | -33.6% | 72.2% | 38.6% | -557% | [Form S-1](https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm), statements of operations and Note 8 |
| Tesla | 12 months to 2026-06-30 | $103,619M | $4,278M | $7,730M | 4.1% | 7.5% | 11.6% | 3.1% | [StockAnalysis income statement](https://stockanalysis.com/stocks/tsla/financials/income-statement/) |

Anthropic's R&D line includes the compute it uses for research. For the first half of 2026 alone its margin before R&D is 55.6% (-$693 million plus $9,741 million on $16,286 million of revenue).

Margin and jobs move in opposite directions. All five companies in margin Tier 1 are in job Tiers 1 and 2, and the job-heavy companies (Walmart, General Motors, Ford) keep 3% or less. Before research spending, SpaceX and Anthropic look like the established high-margin companies. Tesla does not: at 11.6% before R&D, its low margin is not explained by research alone.

### One competition in each job tier

**Tier 1, capital heavy: Nvidia against Broadcom (AI chips).** Nvidia earns $4.59 million of net profit per employee, 437 times Walmart's $10,500. Broadcom earns $1.16 million. Both design chips and have them made by others, so the factory jobs are counted at their suppliers (mostly TSMC, outside the US). Anthropic, the newest member, has the lowest index of all: 4.2 jobs per $1 billion.

**Tier 2, high margin with many people: Microsoft against Alphabet (software, cloud, AI).** Both have net margins above 40% and each employs more than 200,000 people. Their jobs index (56 to 59) is 35 times lower than Walmart's. This tier holds more than half of all the value and profit. Tesla is here by value, not by margin: it has Ford's margin (3%) with a market value 33 times larger.

**Tier 3, mixed: Berkshire Hathaway against JPMorgan Chase (finance and holdings).** Both sit near 300 to 350 jobs per $1 billion and close to $200,000 of profit per employee. This is the profile of a large, profitable company that still needs a lot of people.

**Tier 4, job heavy: Walmart against Amazon (retail).** Walmart sells $736 billion a year with 2.1 million people and keeps 3 cents of each dollar. Amazon sells $797 billion with 1.58 million people and keeps 17 cents, because its cloud business has few people and a high margin. Amazon does about 44% more revenue per employee. As Amazon grows against Walmart, the same sales need fewer people.

## Ford, Google, Anthropic: three shapes

| | Ford | Alphabet (Google) | Anthropic |
| --- | ---: | ---: | ---: |
| Market value | $46B | $3.64T | $1.27T (first-day close) |
| Employees | 169,000 | 204,757 | 5,300 |
| Revenue | $188B | $471B | $35B |
| Net margin | -3.9% | 50.0% | -557% (12 months to June 2026, mostly non-cash) |
| Jobs per $1B of value | 3,660 | 56.3 | 4.2 |
| Market value per employee | $0.3M | $17.8M | $240M |

- **Ford: many jobs, almost no margin.** Nearly every dollar of revenue goes back out to workers and suppliers. Investors value it at a quarter of one year's revenue.
- **Google: many jobs and a high margin.** It employs more people than Ford and keeps half of its revenue as profit. A high margin and a large workforce can go together.
- **Anthropic: very few people for its value.** Each employee stands for $240 million of company value, about 880 times Ford. But it is not yet a high-profit company: its gross margin is 85%, its operating result was close to zero in the first half of 2026, and it spends heavily on compute. It also pays its people a large part of what it earns: personnel expense was $3.15 billion in the first half of 2026, 19% of revenue, of which $2.19 billion was stock.

## What if profit came back as wages?

These are estimates. Each one states its assumptions.

**What comes back today.** The 12 companies other than Anthropic paid $229 billion of income tax over the last 12 months on $1,307 billion of profit before tax. That is an effective rate of 17.5%, against the US federal rate of 21%. Meta (4.6%) and Broadcom (5.5%) are the lowest. Tax paid to all countries is counted, not only to the US.

**Estimate 1: jobs.** Suppose the group paid out 10% of its net profit, $108 billion a year, as wages for new jobs. The average cost to a US private employer is $46.89 per hour worked ([BLS, June 2026](https://www.bls.gov/news.release/ecec.nr0.htm)), or about $97,500 for a full-time year of 2,080 hours. So $108 billion pays for about **1.1 million average jobs**. With 25% of profit it is about 2.8 million. US payrolls hold 159.3 million jobs ([BLS, October 2026](https://www.bls.gov/news.release/empsit.nr0.htm)), so 10% of the profit equals about 0.7% of US jobs.

**Estimate 2: tax.** What the US government receives from $100, by the route it takes:

| Route for $100 | Federal tax received | How it is calculated |
| --- | ---: | --- |
| Kept as profit | about $17.50 | The group's actual rate. $21 at the full federal rate. Tax on dividends and on gains from share sales comes later and is not counted. |
| Paid to an average earner | about $23.50 | $92.90 of wages after the employer's 7.65% payroll tax. Social Security and Medicare from both sides is 15.3% ([IRS](https://www.irs.gov/taxtopics/tc751)) = $14.20. Federal income tax is assumed at 10% of wages = $9.30. |
| Paid to a high earner (above the $184,500 Social Security limit, [SSA](https://www.ssa.gov/oact/cola/cbb.html)) | about $35 | $98.60 of wages. Medicare only, 3.8% with the additional tax = $3.75. Federal income tax is assumed at 32% = $31.50. |

So wages return about $6 to $18 more federal tax per $100 than profit does. On $108 billion that is **$6 billion to $19 billion a year**. The two income tax rates (10% and 32%) are assumptions of this article, not data.

**What the estimates say.** The tax gain is small next to the $229 billion already paid. The larger effect is who gets the money: about a million households that mostly spend what they earn, or shareholders who mostly save it. Wages also pay into Social Security and Medicare, which profit does not.

**What the estimates leave out.**

- A company cannot simply choose to hire a million people who have nothing to do. Higher pay for existing staff is the more realistic route.
- Profit does not vanish. It pays for investment (these companies are building data centres on a very large scale), and share buybacks and dividends reach pension funds and retirement accounts.
- Share prices would fall if margins fell, which lowers tax on capital gains.
- State taxes and tax paid abroad are not counted.

## AI companies and jobs

The trillion-dollar list shows where the economy has been moving: more value per person. AI companies sit at the far end of that line.

- **Anthropic reports $6.6 million of revenue per employee**, up from $1.4 million a year earlier (S-1, operating efficiency section). That is close to Nvidia ($7.2 million) and 19 times Walmart.
- **An upper-bound illustration.** Anthropic's revenue of $35.3 billion over 12 months equals the employer cost of about 362,000 average US jobs. Per Anthropic employee, that is 68 jobs' worth of pay. This is not a count of jobs replaced: customers also use AI for new work, and they pay less for AI than for the labour it replaces, which would make the real figure larger for the same revenue.

**White-collar work** is where AI reaches first. Anthropic's own study of the US labour market ([Massenkoff and McCrory, March 2026](https://www.anthropic.com/research/labor-market-impacts), as reported by [Fortune](https://fortune.com/2026/03/06/ai-job-losses-report-anthropic-research-great-recession-for-white-collar-workers/) and [The Register](https://www.theregister.com/2026/03/07/anthropic_bods_rework_ai_damage/)) finds:

- AI could in theory do 94% of the tasks in computer and maths jobs and 90% in office and administrative jobs. In observed use it covers 33% of computer and maths tasks.
- The most exposed jobs are computer programmers, customer service staff and data entry workers. The most exposed group earns 47% more on average than the least exposed.
- There is "no systematic increase in unemployment for highly exposed workers since late 2022". But the rate at which young workers find a job in exposed occupations fell by 14% against 2022.
- For scale, the study notes that a doubling of unemployment in the most exposed quarter of jobs, from 3% to 6%, would be clearly visible. It has not happened.

**Blue-collar work** is less exposed for now. In the same study 30% of workers have no exposure at all: cooks, mechanics, bartenders, dishwashers. Replacing these jobs needs robots, not language models, and no source read here measures it. But this is where the job-heavy tiers are: Walmart and Amazon alone employ 3.7 million people, mostly in shops, warehouses and delivery. If robots do reach that work, it reaches the two companies that hold 73% of the group's jobs.

LLMeter's Finance section has a separate estimate of [what AI replacing office work would mean for US GDP](https://maxgerashenko.github.io/LLMeter/finance.html#gdp).

## Verdict on the hypothesis

| Claim | What the data says |
| --- | --- |
| The largest companies earn large margins with few employees | **Mostly true.** 10 of 13 are in Tiers 1 and 2. They hold 83% of the value, 78% of the profit and 19% of the jobs. But Walmart, Amazon and Berkshire are large employers. |
| Employees per dollar of value separates companies clearly | **True.** The index runs from 4 (Anthropic) to 3,660 (Ford), a range of about 870 times. |
| Low-employment companies give less back to society | **Not shown.** They pay $229 billion of income tax and very high wages to the people they do employ. Whether that is "less" than a job-heavy company gives back needs wage bills, US-only headcount and supplier jobs, which were not read. |
| Returning profit as wages would help the economy | **Partly.** About 1.1 million jobs' worth of pay for each 10% of profit, and a small tax gain. The effect on investment and share prices is not estimated. |
| New AI companies replace jobs | **Early signs only.** No measured rise in unemployment yet, slower hiring of young workers in exposed jobs. |

## Limits

- **Employees are worldwide.** Apple, Amazon and Walmart employ many people outside the US. US-only numbers are in annual reports and were not read.
- **Jobs at suppliers are not counted.** Apple and Nvidia have their products made by other companies. Ford makes its own. This makes Tier 1 and Tier 2 companies look lighter on jobs than their whole supply chain is.
- **Market value moves every day.** Values on the company pages and on the list page differ by a few percent (Nvidia: $3.75 trillion and $3.93 trillion). The index should be read as a rough size, not to the decimal.
- **One data provider.** All company numbers come from StockAnalysis pages, not from the annual reports themselves. They were not cross-checked against filings.
- **Jobs are counted, not pay.** A job at Nvidia and a job at Walmart count the same. Total wages per company are not published in a comparable way.
- **The estimates are static.** They assume nothing else changes when profit becomes wages.
- **Net profit includes one-off gains and losses**, as in the Alphabet row.

## Sources

| Source | Publisher | Published or updated | What was taken |
| --- | --- | --- | --- |
| [Biggest companies by market cap](https://stockanalysis.com/list/biggest-companies/) | StockAnalysis | Live list, read 2026-11-20 | Which companies are above $1 trillion |
| [The largest companies by market cap in November 2026](https://www.fool.com/research/largest-companies-by-market-cap/) | The Motley Fool | 2026-11-08, data to 2026-11-19 | Cross-check of the list; Berkshire Hathaway |
| StockAnalysis statistics pages, one per company (linked in the data tables) | StockAnalysis | 2026-10-27 to 2026-11-18 | Market value, revenue, net profit, margins, employees, income tax, tax rate |
| [Stock market today, 19 November 2026 (live blog)](https://finance.yahoo.com/markets/live/stock-market-today-thursday-november-19-dow-sp-500-nasdaq-anthropic-ipo-live-141306032.html), [Anthropic stock's first trade](https://finance.yahoo.com/markets/article/anthropic-stocks-first-trade-was-worth-12-billion--34-above-its-ipo-price-171721561.html), [Anthropic prices IPO at $83](https://finance.yahoo.com/markets/stocks/articles/anthropic-prices-ipo-83-share-014000480.html) | Yahoo Finance | 2026-11-18 and 2026-11-19 | Anthropic's IPO price ($83), opening price ($111.50), closing price ($97.17), 13.1 billion implied shares outstanding, about $1.5 trillion fully diluted at the IPO price. The Yahoo Finance quote page for ANT still showed "Pending IPO" when read. |
| [Anthropic, PBC Form S-1](https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm) | Anthropic, filed with the SEC | 2026-10-26 | Staff, revenue, personnel expense (from [data/anthropic-s1-2026-10-26.csv](../data/anthropic-s1-2026-10-26.csv)) |
| [Employer Costs for Employee Compensation](https://www.bls.gov/news.release/ecec.nr0.htm) | US Bureau of Labor Statistics | 2026-09-09 (June 2026) | $46.89 per hour: $32.82 wages, $14.07 benefits |
| [The Employment Situation](https://www.bls.gov/news.release/empsit.nr0.htm), [Table B-1](https://www.bls.gov/news.release/empsit.t17.htm) | US Bureau of Labor Statistics | 2026-11-06 (October 2026) | 159,293 thousand payroll jobs; 4.1% unemployment |
| [Usual Weekly Earnings](https://www.bls.gov/news.release/wkyeng.nr0.htm) | US Bureau of Labor Statistics | 2026-10-21 (Q3 2026) | Median full-time pay of $1,232 a week, used as a check on the average job cost |
| [Topic no. 751, Social Security and Medicare withholding rates](https://www.irs.gov/taxtopics/tc751) | US Internal Revenue Service | Reviewed 2026-11-09 | 6.2% and 1.45% each for employee and employer; 0.9% additional Medicare tax |
| [Contribution and benefit base](https://www.ssa.gov/oact/cola/cbb.html) | US Social Security Administration | 2026 | $184,500 wage limit for Social Security tax |
| [AI job losses report](https://fortune.com/2026/03/06/ai-job-losses-report-anthropic-research-great-recession-for-white-collar-workers/) | Fortune | 2026-03-06 | Numbers from the Anthropic labour market study |
| [Anthropic bods rework AI damage yardstick](https://www.theregister.com/2026/03/07/anthropic_bods_rework_ai_damage/) | The Register | 2026-03-07 | Quotes from the same study |

The Anthropic study itself ([Labor market impacts of AI: a new measure and early evidence](https://www.anthropic.com/research/labor-market-impacts)) was not read directly; its numbers come from the two news reports.
