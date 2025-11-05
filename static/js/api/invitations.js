/**
 * 邀请相关API
 * 处理群组邀请的发送、接收、管理等功能
 */

import { apiRequest, apiGet, apiPost, apiDelete, notifications } from '../ui/utils.js';

// 获取用户的待处理邀请
export async function getPendingInvitations() {
  try {
    console.log('正在获取待处理邀请...');
    
    const response = await apiGet('/invitations/pending/');
    
    console.log('获取待处理邀请成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取待处理邀请失败:', error);
    notifications.error('获取待处理邀请失败');
    throw error;
  }
}

// 获取所有邀请记录
export async function getAllInvitations(page = 1, limit = 20) {
  try {
    console.log('正在获取邀请记录...', page);
    
    const response = await apiGet('/invitations/', {
      page: page,
      limit: limit
    });
    
    console.log('获取邀请记录成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取邀请记录失败:', error);
    notifications.error('获取邀请记录失败');
    throw error;
  }
}

// 接受邀请
export async function acceptInvitation(invitationId) {
  try {
    console.log('正在接受邀请...', invitationId);
    
    notifications.showLoading('正在接受邀请...');
    
    const response = await apiPost(`/invitations/${invitationId}/accept/`);
    
    notifications.hideLoading();
    
    if (response.message || response.success) {
      notifications.success('已成功加入群组', 3000);
      console.log('接受邀请成功:', response);
      return response;
    } else {
      throw new Error('接受邀请响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('接受邀请失败:', error);
    
    let errorMessage = '接受邀请失败';
    if (error.message.includes('400')) {
      errorMessage = '邀请已过期或无效';
    } else if (error.message.includes('409')) {
      errorMessage = '您已经是该群组成员';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 拒绝邀请
export async function declineInvitation(invitationId, reason = '') {
  try {
    console.log('正在拒绝邀请...', invitationId);
    
    notifications.showLoading('正在拒绝邀请...');
    
    const response = await apiPost(`/invitations/${invitationId}/decline/`, {
      reason: reason
    });
    
    notifications.hideLoading();
    
    if (response.message || response.success) {
      notifications.success('已拒绝邀请', 2000);
      console.log('拒绝邀请成功:', response);
      return response;
    } else {
      throw new Error('拒绝邀请响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('拒绝邀请失败:', error);
    
    let errorMessage = '拒绝邀请失败';
    if (error.message.includes('400')) {
      errorMessage = '邀请已过期或无效';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 取消邀请
export async function cancelInvitation(invitationId) {
  try {
    console.log('正在取消邀请...', invitationId);
    
    notifications.showLoading('正在取消邀请...');
    
    const response = await apiDelete(`/invitations/${invitationId}/`);
    
    notifications.hideLoading();
    
    notifications.success('邀请已取消', 2000);
    console.log('取消邀请成功');
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('取消邀请失败:', error);
    
    let errorMessage = '取消邀请失败';
    if (error.message.includes('403')) {
      errorMessage = '没有权限取消该邀请';
    } else if (error.message.includes('404')) {
      errorMessage = '邀请不存在';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 重新发送邀请
export async function resendInvitation(invitationId) {
  try {
    console.log('正在重新发送邀请...', invitationId);
    
    notifications.showLoading('正在重新发送邀请...');
    
    const response = await apiPost(`/invitations/${invitationId}/resend/`);
    
    notifications.hideLoading();
    
    if (response.message || response.success) {
      notifications.success('邀请邮件重新发送成功', 3000);
      console.log('重新发送邀请成功:', response);
      return response;
    } else {
      throw new Error('重新发送邀请响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('重新发送邀请失败:', error);
    
    let errorMessage = '重新发送邀请失败';
    if (error.message.includes('400')) {
      errorMessage = '邀请状态不允许重新发送';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 获取邀请详情
export async function getInvitationDetails(invitationId) {
  try {
    console.log('正在获取邀请详情...', invitationId);
    
    const response = await apiGet(`/invitations/${invitationId}/`);
    
    console.log('获取邀请详情成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取邀请详情失败:', error);
    notifications.error('获取邀请详情失败');
    throw error;
  }
}

// 检查邀请有效性
export async function checkInvitationValidity(invitationId) {
  try {
    console.log('正在检查邀请有效性...', invitationId);
    
    const response = await apiGet(`/invitations/${invitationId}/validity/`);
    
    console.log('检查邀请有效性成功:', response);
    return response;
    
  } catch (error) {
    console.error('检查邀请有效性失败:', error);
    throw error;
  }
}

// 获取群组的邀请统计
export async function getGroupInvitationStats(groupId) {
  try {
    console.log('正在获取群组邀请统计...', groupId);
    
    const response = await apiGet(`/groups/${groupId}/invitations/stats/`);
    
    console.log('获取群组邀请统计成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取群组邀请统计失败:', error);
    notifications.error('获取群组邀请统计失败');
    throw error;
  }
}

// 批量处理邀请
export async function batchProcessInvitations(invitationIds, action, reason = '') {
  try {
    console.log('正在批量处理邀请...', invitationIds, action);
    
    notifications.showLoading(`正在${action === 'accept' ? '接受' : '拒绝'}邀请...`);
    
    const response = await apiPost('/invitations/batch/', {
      invitation_ids: invitationIds,
      action: action,
      reason: reason
    });
    
    notifications.hideLoading();
    
    if (response.processed_count) {
      const message = `成功${action === 'accept' ? '接受' : '拒绝'}了 ${response.processed_count} 个邀请`;
      notifications.success(message, 3000);
      console.log('批量处理邀请成功:', response);
      return response;
    } else {
      throw new Error('批量处理邀请响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('批量处理邀请失败:', error);
    
    let errorMessage = '批量处理邀请失败';
    if (error.message.includes('400')) {
      errorMessage = '请求参数无效';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 获取邀请历史记录
export async function getInvitationHistory(groupId = null, page = 1, limit = 20) {
  try {
    console.log('正在获取邀请历史...', groupId, page);
    
    const params = {
      page: page,
      limit: limit
    };
    
    if (groupId) {
      params.group_id = groupId;
    }
    
    const response = await apiGet('/invitations/history/', params);
    
    console.log('获取邀请历史成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取邀请历史失败:', error);
    notifications.error('获取邀请历史失败');
    throw error;
  }
}

// 设置邀请偏好
export async function setInvitationPreferences(preferences) {
  try {
    console.log('正在设置邀请偏好...', preferences);
    
    notifications.showLoading('正在保存偏好设置...');
    
    const response = await apiPost('/invitations/preferences/', preferences);
    
    notifications.hideLoading();
    
    notifications.success('偏好设置已保存', 2000);
    console.log('设置邀请偏好成功:', response);
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('设置邀请偏好失败:', error);
    
    let errorMessage = '保存偏好设置失败';
    if (error.message.includes('400')) {
      errorMessage = '偏好设置参数无效';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 获取邀请偏好
export async function getInvitationPreferences() {
  try {
    console.log('正在获取邀请偏好...');
    
    const response = await apiGet('/invitations/preferences/');
    
    console.log('获取邀请偏好成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取邀请偏好失败:', error);
    throw error;
  }
}

// 导出邀请数据
export async function exportInvitations(groupId, format = 'csv') {
  try {
    console.log('正在导出邀请数据...', groupId, format);
    
    notifications.showLoading('正在导出邀请数据...');
    
    const response = await apiGet(`/groups/${groupId}/invitations/export/`, {
      format: format
    });
    
    notifications.hideLoading();
    
    // 创建下载链接
    if (response.download_url) {
      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = `invitations_${groupId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      notifications.success('邀请数据导出成功', 3000);
    }
    
    console.log('导出邀请数据成功:', response);
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('导出邀请数据失败:', error);
    
    let errorMessage = '导出邀请数据失败';
    if (error.message.includes('400')) {
      errorMessage = '导出参数无效';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}