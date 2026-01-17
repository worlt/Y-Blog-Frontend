<script setup>
import { onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { getVisitStats, getVisitList, getTodayStats } from '@/api/visit.js'
import { ElMessage } from 'element-plus'

const chartRef = ref(null)
const pieChartRef = ref(null)
const days = ref(7)
const loading = ref(false)
const visitList = ref([])
const tableLoading = ref(false)
const pieLoading = ref(false)

let myChart = null
let myPieChart = null

onMounted(() => {
  initCharts()
  fetchData()
  fetchVisitList()
  fetchPieData()
  
  window.addEventListener('resize', handleResize)
})

const handleResize = () => {
  myChart && myChart.resize()
  myPieChart && myPieChart.resize()
}

const initCharts = () => {
  if (chartRef.value) {
    myChart = echarts.init(chartRef.value)
  }
  if (pieChartRef.value) {
    myPieChart = echarts.init(pieChartRef.value)
  }
}

const fetchData = async () => {
    loading.value = true
    try {
        const res = await getVisitStats(days.value)
        if (res.code === 0) {
            renderChart(res.data)
        } else {
            ElMessage.error(res.msg || '获取统计数据失败')
        }
    } catch (error) {
        console.error(error)
        ElMessage.error('获取统计数据失败')
    } finally {
        loading.value = false
    }
}

const fetchVisitList = async () => {
    tableLoading.value = true
    try {
        const res = await getVisitList(20)
        if (res.code === 0) {
            visitList.value = res.data
        }
    } catch (error) {
        console.error(error)
    } finally {
        tableLoading.value = false
    }
}

const fetchPieData = async () => {
    pieLoading.value = true
    try {
        const res = await getTodayStats()
        if (res.code === 0) {
            renderPieChart(res.data)
        }
    } catch (error) {
        console.error(error)
    } finally {
        pieLoading.value = false
    }
}

const renderChart = (data) => {
    const { dateList, pvList, uvList } = data
    
    const option = {
        title: {
            text: '网站访问趋势',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['浏览量 (PV)', '访客数 (UV)'],
            bottom: 10
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: dateList
        },
        yAxis: {
            type: 'value'
        },
        series: [
            {
                name: '浏览量 (PV)',
                type: 'line',
                data: pvList,
                smooth: true,
                itemStyle: { color: '#409EFF' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(64,158,255,0.5)' },
                        { offset: 1, color: 'rgba(64,158,255,0.1)' }
                    ])
                }
            },
            {
                name: '访客数 (UV)',
                type: 'line',
                data: uvList,
                smooth: true,
                itemStyle: { color: '#67C23A' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(103,194,58,0.5)' },
                        { offset: 1, color: 'rgba(103,194,58,0.1)' }
                    ])
                }
            }
        ]
    }
    
    myChart.setOption(option)
}

const renderPieChart = (data) => {
    const { userCount, guestCount } = data
    const option = {
        title: {
            text: '今日访客分布',
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        legend: {
            bottom: 10,
            left: 'center'
        },
        series: [
            {
                name: '访客类型',
                type: 'pie',
                radius: '50%',
                data: [
                    { value: userCount, name: '用户' },
                    { value: guestCount, name: '游客' }
                ],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    }
    myPieChart.setOption(option)
}

const handleDaysChange = () => {
    fetchData()
}
</script>

<template>
  <div class="dashboard-container">
    <!-- 第一行：趋势图 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="24">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>数据统计</span>
              <el-radio-group v-model="days" size="small" @change="handleDaysChange">
                <el-radio-button :label="7">近7天</el-radio-button>
                <el-radio-button :label="14">近14天</el-radio-button>
                <el-radio-button :label="30">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" v-loading="loading">
            <div ref="chartRef" style="width: 100%; height: 400px;"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 第二行：饼图 + 访问列表 -->
    <el-row :gutter="20">
      <el-col :span="8">
          <el-card class="box-card">
              <template #header>
                  <div class="card-header">
                      <span>今日访客分布</span>
                  </div>
              </template>
              <div class="chart-container" v-loading="pieLoading">
                  <div ref="pieChartRef" style="width: 100%; height: 400px;"></div>
              </div>
          </el-card>
      </el-col>
      
      <el-col :span="16">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>最新访问</span>
              <el-button link type="primary" @click="fetchVisitList">刷新</el-button>
            </div>
          </template>
          <el-table :data="visitList" style="width: 100%" height="400" v-loading="tableLoading" stripe>
            <el-table-column prop="visitDate" label="日期" width="120" align="center">
               <template #default="scope">
                   {{ scope.row.visitDate }}
               </template>
            </el-table-column>
            <el-table-column prop="ip" label="IP地址" show-overflow-tooltip align="center"></el-table-column>
            <el-table-column prop="count" label="次数" width="80" align="center"></el-table-column>
            <el-table-column prop="lastVisitTime" label="最后访问" width="180" align="center">
                <template #default="scope">
                    {{ scope.row.lastVisitTime.replace('T', ' ') }}
                </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
