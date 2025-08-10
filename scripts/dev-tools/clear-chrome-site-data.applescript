-- 清理 Google Chrome 中 http://localhost:3000 的站点数据（localStorage、sessionStorage、caches、IndexedDB）
-- 注意：首次运行可能需要授予“辅助功能/自动化”权限

tell application "Google Chrome"
  if (count of windows) is 0 then make new window
  set theURL to "http://localhost:3000/"
  tell window 1
    if (count of tabs) is 0 then
      make new tab with properties {URL:theURL}
    else
      set URL of active tab to theURL
    end if
    delay 1
    -- 在活动标签页中执行清理脚本
    tell active tab to execute javascript "(async () => {\n  try {\n    // 清理 Storage\n    localStorage.clear();\n    sessionStorage.clear();\n\n    // 清理 caches\n    if (window.caches && caches.keys) {\n      const keys = await caches.keys();\n      await Promise.all(keys.map(k => caches.delete(k)));\n    }\n\n    // 清理 IndexedDB\n    if (window.indexedDB) {\n      const dbs = await indexedDB.databases ? await indexedDB.databases() : [];\n      if (dbs && dbs.forEach) {\n        dbs.forEach(db => {\n          if (db && db.name) { indexedDB.deleteDatabase(db.name); }\n        });\n      } else {\n        // Fallback: 尝试删除常见名称\n        ['keyval-store','workbox-precache-v2','workbox-precache-v3'].forEach(n => {\n          try { indexedDB.deleteDatabase(n); } catch(e){}\n        });\n      }\n    }\n\n    console.log('[cache] Site data cleared for', location.origin);\n  } catch (e) {\n    console.warn('[cache] Failed to fully clear site data:', e);\n  }\n})();"
  end tell
end tell
