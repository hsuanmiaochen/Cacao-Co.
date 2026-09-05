# 許願池 —— 資料庫（Google 試算表）與網站部署步驟

這個網站是純前端的 `index.html`,資料存在你自己的 Google 試算表裡,
不需要任何付費的伺服器。整體架構：

```
大家的瀏覽器 → index.html（免費放在 GitHub Pages）
                    ↓ 讀寫
             Google Apps Script 網頁應用程式（免費）
                    ↓
             你的 Google 試算表（你的 Google 雲端）
```

## 第一步：建立試算表 + 貼上後端程式

1. 到 [Google 試算表](https://sheets.new) 建立一份新的空白試算表,取個名字例如「社團許願池資料庫」。
2. 上方選單「擴充功能」→「Apps Script」,會開啟一個新分頁的程式碼編輯器。
3. 把編輯器裡預設的 `myFunction` 內容全部刪掉,貼上這個 repo 裡 `apps-script/Code.gs` 的完整內容。
4. 按上方的儲存（磁碟圖示）。
5.（選用）在函式下拉選單選擇 `seedExampleData`,按執行 ▶️,第一次執行會跳出授權視窗:
   - 選你自己的 Google 帳號
   - 出現「未經驗證」警告時,點「進階」→「前往（專案名稱）(不安全)」→「允許」
   - 這是正常的,因為這是你自己寫（貼上）的程式,Google 還沒有幫它做審核
   - 執行完成後回到試算表,應該會看到 `Wishes`、`Votes`、`Comments`、`Settings` 幾個分頁,`Wishes` 裡有 3 筆範例資料。
   - 不想要範例資料的話跳過這步,之後大家自己送出的許願會自動建立分頁。

## 第二步：部署成網頁應用程式,拿到 API 網址

1. 在 Apps Script 編輯器右上角,按「部署」→「新增部署作業」。
2. 類型選「網頁應用程式」。
3. 「執行身分」選你自己（擁有者）。
4. 「誰可以存取」選**「所有人」**(這樣任何人開網站都能讀寫試算表,不需要登入 Google——這是必要設定,不然社員的瀏覽器打不開資料)。
5. 按「部署」,第一次一樣會要求授權,照第一步的方式允許。
6. 部署完成後會給你一組網址,長得像:
   `https://script.google.com/macros/s/AKfycb.../exec`
   把它整組複製下來。

> 之後如果你修改了 `Code.gs`,要記得「部署」→「管理部署作業」→ 選現有部署 → 版本選「新版本」→ 部署,網址才會套用新程式碼(部署新版不會換網址)。

## 第三步：把網址接進網站

打開這個 repo 的 `index.html`,找到最上面 `<script>` 區塊的這一行:

```js
const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
```

把 `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` 換成第二步拿到的網址,存檔、推上 GitHub。
（沒有工程背景也沒關係:把網址貼給 Claude,請它幫你改這一行並推送即可。）

在還沒貼上正式網址之前,網站會自動用「瀏覽器示範模式」執行,資料只存在你自己的瀏覽器,
不會影響任何人,可以先拿來試玩、確認欄位和流程夠不夠用。

## 第四步：把網站放到免費網域上（GitHub Pages）

1. 到這個 repo 的 GitHub 頁面 →「Settings」→ 左側選單「Pages」。
2. 「Build and deployment」的「Source」選「Deploy from a branch」。
3. Branch 選 `main`,資料夾選 `/ (root)`,按「Save」。
4. 等 1～2 分鐘,頁面會顯示網站網址,通常長得像:
   `https://hsuanmiaochen.github.io/Cacao-Co./`
5. 這個網址就可以直接分享給社員,不需要開 GitHub、不需要登入任何帳號就能看、能許願、能投票留言。

## 之後的維運

- **改額度或社團人數**：打開試算表的 `Settings` 分頁,改 `annualCap`(年度發展補助上限)或 `totalMembers`(社團總人數,用來算大型設備 1/3 投票門檻)。
- **核准／核銷狀態**：可以直接在網站每張卡片下方的「幹部處理」下拉選單改狀態,或到試算表 `Wishes` 分頁的 `status` 欄位改,兩邊互通。
- **備份**：資料就是一份普通的 Google 試算表,你原本怎麼備份 Google 雲端資料,這份就跟著一起備份。
- **想換成正式網域**（例如 `budget.你的社團.com`）：GitHub Pages 支援綁自訂網域,在同一個「Settings → Pages」頁面下方「Custom domain」設定,前提是你有一個網域名稱(這一步通常不是免費的,免費方案就是用 `github.io` 的網址)。
