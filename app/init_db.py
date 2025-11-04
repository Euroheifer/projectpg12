#!/usr/bin/env python3
"""
简化的数据库初始化脚本
"""
import sys
import os
import logging
from sqlalchemy import inspect, text

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_database():
    """创建数据库表"""
    try:
        # 导入模块
        from database import engine
        import models
        
        logger.info("开始创建数据库表...")
        
        # 检查连接
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            db_version = result.fetchone()
            logger.info(f"数据库连接成功: {db_version[0]}")
        
        # 创建所有表
        models.Base.metadata.create_all(bind=engine)
        
        # 检查创建的表
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        logger.info(f"成功创建的表: {table_names}")
        
        logger.info("数据库初始化完成!")
        return True
        
    except ImportError as e:
        logger.error(f"导入错误: {e}")
        logger.error("请确保所有依赖都已安装")
        return False
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        return False

if __name__ == "__main__":
    create_database()