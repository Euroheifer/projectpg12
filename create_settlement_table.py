#!/usr/bin/env python3
"""
创建结算表的数据库迁移脚本
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, Column, Integer, ForeignKey, DateTime, Numeric, String, Text, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 数据库连接
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/projectpg12"
engine = create_engine(DATABASE_URL)
Base = declarative_base()

# Settlement表定义
class Settlement(Base):
    __tablename__ = "settlements"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)  # Store in Yuan
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(String, nullable=True)

def create_settlement_table():
    """创建Settlement表"""
    try:
        logger.info("开始创建Settlement表...")
        
        # 创建表
        Settlement.__table__.create(engine, checkfirst=True)
        logger.info("Settlement表创建成功！")
        
        # 创建会话并测试
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # 测试表是否正常
        result = session.execute("SELECT COUNT(*) FROM settlements")
        count = result.scalar()
        logger.info(f"Settlement表当前记录数: {count}")
        
        session.close()
        logger.info("数据库迁移完成！")
        
    except Exception as e:
        logger.error(f"创建表时出错: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    create_settlement_table()
