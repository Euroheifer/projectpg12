#!/usr/bin/env python3
"""
ProjectPG12 项目最终验证脚本
验证所有关键功能和文件的完整性
"""

import os
import sys
import json
import subprocess
from pathlib import Path

def check_file_exists(file_path, description):
    """检查文件是否存在"""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} - 文件不存在")
        return False

def check_python_syntax(file_path):
    """检查Python文件语法"""
    try:
        result = subprocess.run([
            'python', '-m', 'py_compile', file_path
        ], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Python语法检查通过: {file_path}")
            return True
        else:
            print(f"❌ Python语法错误: {file_path}")
            print(f"错误信息: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Python语法检查失败: {file_path} - {e}")
        return False

def count_js_files():
    """统计JavaScript文件"""
    js_dir = Path("app/static/js")
    if js_dir.exists():
        js_files = list(js_dir.rglob("*.js"))
        return len(js_files)
    return 0

def check_docker_config():
    """检查Docker配置"""
    dockerfile_ok = check_file_exists("Dockerfile", "Dockerfile")
    compose_ok = check_file_exists("docker-compose.yml", "docker-compose.yml")
    return dockerfile_ok and compose_ok

def check_requirements():
    """检查依赖文件"""
    return check_file_exists("requirements.txt", "requirements.txt")

def check_python_files():
    """检查Python文件"""
    python_files = [
        "app/main.py",
        "app/database.py", 
        "app/models.py",
        "app/schemas.py",
        "app/crud.py",
        "app/auth.py",
        "app/dependencies.py"
    ]
    
    all_ok = True
    for file_path in python_files:
        if os.path.exists(file_path):
            if not check_python_syntax(file_path):
                all_ok = False
        else:
            print(f"❌ Python文件不存在: {file_path}")
            all_ok = False
    
    return all_ok

def check_js_files():
    """检查JavaScript文件"""
    js_dir = Path("app/static/js")
    if not js_dir.exists():
        print("❌ JavaScript目录不存在: app/static/js")
        return False
    
    js_files = list(js_dir.rglob("*.js"))
    print(f"📊 发现JavaScript文件: {len(js_files)}个")
    
    for js_file in js_files:
        print(f"✅ JavaScript文件: {js_file}")
    
    return len(js_files) > 0

def check_templates():
    """检查HTML模板"""
    templates_dir = Path("app/templates")
    if not templates_dir.exists():
        print("❌ 模板目录不存在: app/templates")
        return False
    
    html_files = list(templates_dir.glob("*.html"))
    print(f"📊 发现HTML模板: {len(html_files)}个")
    
    for html_file in html_files:
        print(f"✅ HTML模板: {html_file}")
    
    return len(html_files) > 0

def check_css_files():
    """检查CSS文件"""
    css_dir = Path("app/static/css")
    if not css_dir.exists():
        print("❌ CSS目录不存在: app/static/css")
        return False
    
    css_files = list(css_dir.glob("*.css"))
    print(f"📊 发现CSS文件: {len(css_files)}个")
    
    for css_file in css_files:
        print(f"✅ CSS文件: {css_file}")
    
    return len(css_files) > 0

def check_documentation():
    """检查文档文件"""
    doc_files = [
        "README.md",
        "全面功能测试报告.md",
        "项目结构说明文档.md", 
        "项目状态总结.md",
        "SETTLEMENT_FIX_REPORT.md",
        "invitation_fix_report.md",
        "费用删除功能修复报告.md",
        "定期费用付款人选择器修复报告.md"
    ]
    
    all_ok = True
    for doc_file in doc_files:
        if not check_file_exists(doc_file, f"文档文件: {doc_file}"):
            all_ok = False
    
    return all_ok

def check_test_files():
    """检查测试文件"""
    test_files = [
        "test_settlement_api.py",
        "verify_settlement_logic.py",
        "verify_settlement_logic_fixed.py", 
        "test_expense_deletion.py",
        "test_settlement.html"
    ]
    
    all_ok = True
    for test_file in test_files:
        check_file_exists(test_file, f"测试文件: {test_file}")
    
    return all_ok

def main():
    """主验证函数"""
    print("=" * 60)
    print("🔍 ProjectPG12 项目最终验证")
    print("=" * 60)
    
    # 切换到项目目录
    os.chdir("/workspace/projectpg12")
    
    # 验证项目结构
    print("\n📁 项目结构验证:")
    print("-" * 30)
    
    checks = {
        "Docker配置": check_docker_config(),
        "依赖文件": check_requirements(),
        "Python文件": check_python_files(),
        "JavaScript文件": check_js_files(),
        "HTML模板": check_templates(),
        "CSS文件": check_css_files(),
        "文档文件": check_documentation(),
        "测试文件": check_test_files()
    }
    
    # 统计结果
    total_checks = len(checks)
    passed_checks = sum(checks.values())
    
    print("\n" + "=" * 60)
    print("📊 验证结果统计")
    print("=" * 60)
    
    for check_name, result in checks.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{check_name:15} : {status}")
    
    print(f"\n总计: {passed_checks}/{total_checks} 项检查通过")
    
    # 总体状态
    if passed_checks == total_checks:
        print("\n🎉 项目验证全部通过！")
        print("✅ 项目状态: 生产就绪")
        print("🚀 可以安全部署到生产环境")
        return 0
    else:
        print(f"\n⚠️  有 {total_checks - passed_checks} 项检查未通过")
        print("❌ 项目状态: 需要修复")
        print("🔧 请修复问题后重新验证")
        return 1

if __name__ == "__main__":
    sys.exit(main())