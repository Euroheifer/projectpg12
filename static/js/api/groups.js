/**
 * 群组相关API
 * 处理群组的创建、查询、更新、删除等操作
 */

import { apiRequest, apiGet, apiPost, apiPut, apiDelete, notifications } from '../ui/utils.js';

// 获取用户的所有群组
export async function getUserGroups(userId = null) {
  try {
    console.log('正在获取群组列表...');
    
    const params = userId ? { user_id: userId } : {};
    const response = await apiGet('/groups/', params);
    
    console.log('获取群组列表成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取群组列表失败:', error);
    notifications.error('获取群组列表失败');
    throw error;
  }
}

// 获取群组详情
export async function getGroupDetails(groupId) {
  try {
    console.log('正在获取群组详情...', groupId);
    
    const response = await apiGet(`/groups/${groupId}/`);
    
    console.log('获取群组详情成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取群组详情失败:', error);
    notifications.error('获取群组详情失败');
    throw error;
  }
}

// 创建新群组
export async function createNewGroup(groupData) {
  try {
    console.log('正在创建群组...', groupData);
    
    notifications.showLoading('正在创建群组...');
    
    const response = await apiPost('/groups/', {
      name: groupData.name,
      description: groupData.description || ''
    });
    
    notifications.hideLoading();
    
    if (response.id) {
      notifications.success('群组创建成功', 2000);
      console.log('群组创建成功:', response);
      return response;
    } else {
      throw new Error('创建群组响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('创建群组失败:', error);
    
    let errorMessage = '创建群组失败';
    if (error.message.includes('400')) {
      errorMessage = '群组名称不能为空或已存在';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 更新群组信息
export async function updateGroup(groupId, groupData) {
  try {
    console.log('正在更新群组...', groupId, groupData);
    
    notifications.showLoading('正在更新群组...');
    
    const response = await apiPut(`/groups/${groupId}/`, {
      name: groupData.name,
      description: groupData.description
    });
    
    notifications.hideLoading();
    
    notifications.success('群组信息更新成功', 2000);
    console.log('群组更新成功:', response);
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('更新群组失败:', error);
    
    let errorMessage = '更新群组失败';
    if (error.message.includes('403')) {
      errorMessage = '没有权限修改群组信息';
    } else if (error.message.includes('404')) {
      errorMessage = '群组不存在';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 删除群组
export async function deleteGroup(groupId) {
  try {
    console.log('正在删除群组...', groupId);
    
    notifications.showLoading('正在删除群组...');
    
    const response = await apiDelete(`/groups/${groupId}/`);
    
    notifications.hideLoading();
    
    notifications.success('群组删除成功', 2000);
    console.log('群组删除成功');
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('删除群组失败:', error);
    
    let errorMessage = '删除群组失败';
    if (error.message.includes('403')) {
      errorMessage = '没有权限删除群组';
    } else if (error.message.includes('404')) {
      errorMessage = '群组不存在';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 邀请成员
export async function inviteMember(groupId, email, message = '') {
  try {
    console.log('正在邀请成员...', groupId, email);
    
    notifications.showLoading('正在发送邀请...');
    
    const response = await apiPost(`/groups/${groupId}/invite/`, {
      email: email,
      message: message
    });
    
    notifications.hideLoading();
    
    if (response.message) {
      notifications.success('邀请邮件已发送', 3000);
      console.log('邀请发送成功:', response);
      return response;
    } else {
      throw new Error('邀请响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('邀请成员失败:', error);
    
    let errorMessage = '邀请成员失败';
    if (error.message.includes('400')) {
      errorMessage = '邮箱格式无效或用户不存在';
    } else if (error.message.includes('403')) {
      errorMessage = '没有权限邀请成员';
    } else if (error.message.includes('409')) {
      errorMessage = '该用户已是群组成员';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 获取群组成员列表
export async function getGroupMembers(groupId) {
  try {
    console.log('正在获取群组成员...', groupId);
    
    const response = await apiGet(`/groups/${groupId}/members/`);
    
    console.log('获取群组成员成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取群组成员失败:', error);
    notifications.error('获取群组成员失败');
    throw error;
  }
}

// 移除群组成员
export async function removeGroupMember(groupId, userId) {
  try {
    console.log('正在移除成员...', groupId, userId);
    
    notifications.showLoading('正在移除成员...');
    
    const response = await apiDelete(`/groups/${groupId}/members/${userId}/`);
    
    notifications.hideLoading();
    
    notifications.success('成员移除成功', 2000);
    console.log('成员移除成功');
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('移除成员失败:', error);
    
    let errorMessage = '移除成员失败';
    if (error.message.includes('403')) {
      errorMessage = '没有权限移除该成员';
    } else if (error.message.includes('404')) {
      errorMessage = '成员不存在';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 退出群组
export async function leaveGroup(groupId) {
  try {
    console.log('正在退出群组...', groupId);
    
    notifications.showLoading('正在退出群组...');
    
    const response = await apiPost(`/groups/${groupId}/leave/`);
    
    notifications.hideLoading();
    
    notifications.success('已退出群组', 2000);
    console.log('退出群组成功');
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('退出群组失败:', error);
    
    let errorMessage = '退出群组失败';
    if (error.message.includes('400')) {
      errorMessage = '群组管理员不能退出群组';
    } else if (error.message.includes('404')) {
      errorMessage = '群组不存在';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 获取群组费用列表
export async function getGroupExpenses(groupId, page = 1, limit = 20) {
  try {
    console.log('正在获取群组费用...', groupId, page);
    
    const response = await apiGet(`/groups/${groupId}/expenses/`, {
      page: page,
      limit: limit
    });
    
    console.log('获取群组费用成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取群组费用失败:', error);
    notifications.error('获取群组费用失败');
    throw error;
  }
}

// 获取群组统计信息
export async function getGroupStatistics(groupId) {
  try {
    console.log('正在获取群组统计...', groupId);
    
    const response = await apiGet(`/groups/${groupId}/statistics/`);
    
    console.log('获取群组统计成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取群组统计失败:', error);
    notifications.error('获取群组统计失败');
    throw error;
  }
}

// 搜索群组
export async function searchGroups(query, page = 1, limit = 10) {
  try {
    console.log('正在搜索群组...', query);
    
    const response = await apiGet('/groups/search/', {
      q: query,
      page: page,
      limit: limit
    });
    
    console.log('搜索群组成功:', response);
    return response;
    
  } catch (error) {
    console.error('搜索群组失败:', error);
    notifications.error('搜索群组失败');
    throw error;
  }
}

// 获取群组邀请列表
export async function getGroupInvitations(groupId) {
  try {
    console.log('正在获取群组邀请...', groupId);
    
    const response = await apiGet(`/groups/${groupId}/invitations/`);
    
    console.log('获取群组邀请成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取群组邀请失败:', error);
    notifications.error('获取群组邀请失败');
    throw error;
  }
}

// 接受群组邀请
export async function acceptGroupInvitation(invitationId) {
  try {
    console.log('正在接受邀请...', invitationId);
    
    notifications.showLoading('正在接受邀请...');
    
    const response = await apiPost(`/groups/invitations/${invitationId}/accept/`);
    
    notifications.hideLoading();
    
    notifications.success('已接受群组邀请', 2000);
    console.log('接受邀请成功');
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('接受邀请失败:', error);
    
    let errorMessage = '接受邀请失败';
    if (error.message.includes('400')) {
      errorMessage = '邀请已过期或无效';
    } else if (error.message.includes('409')) {
      errorMessage = '您已是该群组成员';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 拒绝群组邀请
export async function declineGroupInvitation(invitationId) {
  try {
    console.log('正在拒绝邀请...', invitationId);
    
    notifications.showLoading('正在拒绝邀请...');
    
    const response = await apiPost(`/groups/invitations/${invitationId}/decline/`);
    
    notifications.hideLoading();
    
    notifications.success('已拒绝群组邀请', 2000);
    console.log('拒绝邀请成功');
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('拒绝邀请失败:', error);
    
    let errorMessage = '拒绝邀请失败';
    if (error.message.includes('400')) {
      errorMessage = '邀请已过期或无效';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}

// 获取用户待处理的邀请
export async function getPendingInvitations() {
  try {
    console.log('正在获取待处理邀请...');
    
    const response = await apiGet('/groups/invitations/pending/');
    
    console.log('获取待处理邀请成功:', response);
    return response;
    
  } catch (error) {
    console.error('获取待处理邀请失败:', error);
    notifications.error('获取待处理邀请失败');
    throw error;
  }
}

// 计算群组结算建议
export async function calculateSettlements(groupId) {
  try {
    console.log('正在计算结算建议...', groupId);
    
    const response = await apiGet(`/groups/${groupId}/settlements/`);
    
    console.log('计算结算建议成功:', response);
    return response;
    
  } catch (error) {
    console.error('计算结算建议失败:', error);
    notifications.error('计算结算建议失败');
    throw error;
  }
}

// 标记结算完成
export async function markSettlementComplete(groupId, settlementId) {
  try {
    console.log('正在标记结算完成...', groupId, settlementId);
    
    notifications.showLoading('正在标记结算完成...');
    
    const response = await apiPost(`/groups/${groupId}/settlements/${settlementId}/complete/`);
    
    notifications.hideLoading();
    
    notifications.success('结算已标记为完成', 2000);
    console.log('标记结算完成成功');
    return response;
    
  } catch (error) {
    notifications.hideLoading();
    console.error('标记结算完成失败:', error);
    
    let errorMessage = '标记结算完成失败';
    if (error.message.includes('403')) {
      errorMessage = '没有权限标记该结算';
    }
    
    notifications.error(errorMessage);
    throw error;
  }
}