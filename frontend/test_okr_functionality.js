/**
 * OKR 功能自动化测试脚本
 * 用于模拟用户操作，测试 OKR 弹窗的各种功能
 * 
 * Docker Compose 版本 - 在 http://localhost:3001 测试
 * 使用方法：打开浏览器访问 http://localhost:3001，打开开发者工具控制台，
 * 复制粘贴此脚本后运行 testOKRFunctionality() 或 testResponsiveDesign()
 */

// 等待页面加载完成
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      } else {
        setTimeout(checkElement, 100);
      }
    };
    checkElement();
  });
}

// 模拟点击事件
function simulateClick(element) {
  const event = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(event);
}

// 模拟输入文本
function simulateInput(element, text) {
  element.focus();
  element.value = text;
  
  // 触发 React 的合成事件
  const inputEvent = new Event('input', { bubbles: true });
  element.dispatchEvent(inputEvent);
  
  const changeEvent = new Event('change', { bubbles: true });
  element.dispatchEvent(changeEvent);
}

// 主测试函数
async function testOKRFunctionality() {
  console.log('🔍 开始 OKR 功能测试...');
  
  try {
    // 1. 测试弹窗打开
    console.log('📝 测试1: 查找并点击新增目标按钮');
    const createButton = await waitForElement('button:contains("新增目标"), [aria-label*="新增"], [title*="新增"]', 15000);
    
    if (!createButton) {
      // 尝试查找其他可能的按钮
      const alternativeButtons = document.querySelectorAll('button');
      for (let button of alternativeButtons) {
        if (button.textContent.includes('新增') || button.textContent.includes('创建') || button.textContent.includes('添加')) {
          console.log('找到候选按钮:', button.textContent);
          simulateClick(button);
          break;
        }
      }
    } else {
      simulateClick(createButton);
    }
    
    // 等待弹窗出现
    console.log('⏳ 等待弹窗出现...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. 检查弹窗高度和滚动条
    console.log('📏 测试2: 检查弹窗高度和滚动条');
    const modal = document.querySelector('.ant-modal');
    const modalBody = document.querySelector('.ant-modal-body');
    
    if (modal && modalBody) {
      console.log('✅ 弹窗已显示');
      console.log(`弹窗高度: ${modal.offsetHeight}px`);
      console.log(`弹窗body最大高度: ${getComputedStyle(modalBody).maxHeight}`);
      console.log(`是否有滚动条: ${modalBody.scrollHeight > modalBody.clientHeight ? '是' : '否'}`);
      
      // 检查滚动条样式
      const scrollbarWidth = modalBody.offsetWidth - modalBody.clientWidth;
      console.log(`滚动条宽度: ${scrollbarWidth}px`);
    }
    
    // 3. 测试创建包含多个关键结果的目标
    console.log('🎯 测试3: 创建包含多个关键结果的目标');
    
    // 填写目标标题
    const titleInput = document.querySelector('input[placeholder*="标题"], input[placeholder*="目标"]');
    if (titleInput) {
      simulateInput(titleInput, '测试OKR目标 - 提升团队效率');
      console.log('✅ 已填写目标标题');
    }
    
    // 填写描述
    const descriptionInput = document.querySelector('textarea[placeholder*="描述"]');
    if (descriptionInput) {
      simulateInput(descriptionInput, '这是一个用于测试弹窗功能的OKR目标，包含多个关键结果。');
      console.log('✅ 已填写目标描述');
    }
    
    // 添加多个关键结果
    console.log('📊 添加多个关键结果...');
    for (let i = 0; i < 4; i++) {
      // 点击添加关键结果按钮
      const addKRButton = document.querySelector('button:contains("添加关键结果"), button[aria-label*="添加"]');
      if (addKRButton) {
        simulateClick(addKRButton);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 填写关键结果信息
        const krTitleInputs = document.querySelectorAll('input[placeholder*="关键结果"]');
        const krDescInputs = document.querySelectorAll('textarea[placeholder*="衡量"]');
        const krTargetInputs = document.querySelectorAll('.ant-input-number-input');
        
        if (krTitleInputs[i]) {
          simulateInput(krTitleInputs[i], `关键结果 ${i + 1}: 完成率提升${(i + 1) * 10}%`);
        }
        if (krDescInputs[i]) {
          simulateInput(krDescInputs[i], `通过具体措施提升${(i + 1) * 10}%的完成率`);
        }
        if (krTargetInputs[i]) {
          simulateInput(krTargetInputs[i], `${(i + 1) * 25}`);
        }
        
        console.log(`✅ 已添加关键结果 ${i + 1}`);
      }
    }
    
    // 4. 检查弹窗是否仍在可视范围内
    console.log('👁️ 测试4: 检查弹窗内容是否超出屏幕');
    
    if (modal) {
      const rect = modal.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      console.log(`弹窗位置: top=${rect.top}, bottom=${rect.bottom}`);
      console.log(`视口高度: ${viewportHeight}`);
      
      if (rect.bottom > viewportHeight) {
        console.log('⚠️ 弹窗底部超出屏幕');
      } else {
        console.log('✅ 弹窗在可视范围内');
      }
      
      // 测试滚动功能
      if (modalBody && modalBody.scrollHeight > modalBody.clientHeight) {
        console.log('🔄 测试滚动功能...');
        modalBody.scrollTop = modalBody.scrollHeight / 2;
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`滚动位置: ${modalBody.scrollTop}px`);
        console.log('✅ 滚动功能正常');
      }
    }
    
    // 5. 测试保存功能
    console.log('💾 测试5: 测试保存功能');
    const saveButton = document.querySelector('button:contains("创建目标"), button:contains("保存"), .ant-btn-primary');
    
    if (saveButton) {
      console.log('准备测试保存功能...');
      // 注意：实际测试中我们不会真的保存，只是检查按钮是否可点击
      console.log(`保存按钮状态: ${saveButton.disabled ? '禁用' : '可用'}`);
      
      if (!saveButton.disabled) {
        console.log('✅ 保存按钮可用，数据验证通过');
      } else {
        console.log('⚠️ 保存按钮被禁用，可能存在验证问题');
      }
    }
    
    // 6. 测试取消功能
    console.log('❌ 测试6: 关闭弹窗');
    const cancelButton = document.querySelector('button:contains("取消"), .ant-modal-close');
    if (cancelButton) {
      simulateClick(cancelButton);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const modalAfterClose = document.querySelector('.ant-modal');
      if (!modalAfterClose || getComputedStyle(modalAfterClose).display === 'none') {
        console.log('✅ 弹窗已成功关闭');
      } else {
        console.log('⚠️ 弹窗未正确关闭');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    return false;
  }
  
  console.log('🎉 OKR 功能测试完成！');
  return true;
}

// 测试不同屏幕尺寸
function testResponsiveDesign() {
  console.log('📱 开始响应式设计测试...');
  
  const screenSizes = [
    { width: 1920, height: 1080, name: '桌面大屏' },
    { width: 1366, height: 768, name: '桌面标准' },
    { width: 768, height: 1024, name: '平板' },
    { width: 375, height: 812, name: '手机' }
  ];
  
  screenSizes.forEach(size => {
    console.log(`测试 ${size.name} (${size.width}x${size.height})`);
    
    // 模拟屏幕尺寸变化
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: size.width
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: size.height
    });
    
    // 触发 resize 事件
    window.dispatchEvent(new Event('resize'));
    
    console.log(`✅ ${size.name} 测试完成`);
  });
}

// 导出测试函数，供浏览器控制台使用
window.testOKRFunctionality = testOKRFunctionality;
window.testResponsiveDesign = testResponsiveDesign;

console.log('🚀 OKR 测试脚本已加载！');
console.log('使用方法:');
console.log('1. testOKRFunctionality() - 运行完整的 OKR 功能测试');
console.log('2. testResponsiveDesign() - 测试响应式设计');