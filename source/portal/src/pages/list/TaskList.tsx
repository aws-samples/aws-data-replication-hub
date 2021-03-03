import React, { useEffect, useState } from "react";
import { useDispatch, useMappedState } from "redux-react-hook";
import { useHistory, Link } from "react-router-dom";
import classNames from "classnames";
import Loader from "react-loader-spinner";
import { useTranslation } from "react-i18next";
import Moment from "react-moment";

import Loading from "../../common/Loading";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import Typography from "@material-ui/core/Typography";
import MLink from "@material-ui/core/Link";
import RefreshIcon from "@material-ui/icons/Refresh";
import Snackbar, { SnackbarOrigin } from "@material-ui/core/Snackbar";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
// import Pagination from "@material-ui/lab/Pagination";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";
import { withStyles } from "@material-ui/core/styles";
import Menu, { MenuProps } from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemText from "@material-ui/core/ListItemText";

import { API } from "aws-amplify";
import { listTasks } from "../../graphql/queries";
import { stopTask } from "../../graphql/mutations";

import { IState } from "../../store/Store";

import LeftMenu from "../../common/LeftMenu";
import Bottom from "../../common/Bottom";
import InfoBar from "../../common/InfoBar";

import NormalButton from "../../common/comp/NormalButton";
import PrimaryButton from "../../common/comp/PrimaryButton";
import StopButtonLoading from "../../common/comp/PrimaryButtonLoading";

import STATUS_PENDING from "@material-ui/icons/Schedule";
import STATUS_STOPED from "@material-ui/icons/RemoveCircleOutline";
import STATUS_ERROR from "@material-ui/icons/HighlightOff";
import STATUS_DONE from "@material-ui/icons/CheckCircleOutline";
import STATUS_PROGRESS from "@material-ui/icons/FlipCameraAndroid";

import "./TaskList.scss";

import STATUS_OK from "@material-ui/icons/CheckCircleOutline";

import PAGE_PREV from "@material-ui/icons/NavigateBefore";
import PAGE_PREV_DISABLED from "@material-ui/icons/NavigateBefore";
import PAGE_NEXT from "@material-ui/icons/NavigateNext";
import PAGE_NEXT_DISABLED from "@material-ui/icons/NavigateNext";

import {
  TASK_STATUS_MAP,
  EnumBucketType,
  EnumTaskStatus,
  EnumTaskType,
  ECREnumSourceType,
} from "../../assets/types/index";
import {
  YES_NO,
  AWS_REGION_LIST,
  DRH_API_HEADER,
  AUTH_TYPE_NAME,
  OPEN_ID_TYPE,
} from "../../assets/config/const";

const StyledMenu = withStyles({
  paper: {
    border: "1px solid #d3d4d5",
  },
})((props: MenuProps) => (
  <Menu
    style={{ borderRadius: 0 }}
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "left",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "left",
    }}
    {...props}
  />
));

const StyledMenuItem = withStyles((theme) => ({
  root: {
    width: 130,
    "& .MuiTypography-body1": {
      fontSize: 14,
    },
  },
}))(MenuItem);

const STATUS_ICON_MAP: any = {
  STARTING: <STATUS_PENDING fontSize="small" />,
  STOPPING: <STATUS_PENDING fontSize="small" />,
  ERROR: <STATUS_ERROR fontSize="small" />,
  IN_PROGRESS: <STATUS_PROGRESS fontSize="small" />,
  DONE: <STATUS_DONE fontSize="small" />,
  STOPPED: <STATUS_STOPED fontSize="small" />,
};

export interface State extends SnackbarOrigin {
  open: boolean;
}

function Alert(props: AlertProps) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const mapState = (state: IState) => ({
  createTaskFlag: state.createTaskFlag,
});

const List: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const { createTaskFlag } = useMappedState(mapState);

  const history = useHistory();
  const [isLoading, setIsLoading] = useState(true);
  const [isStopLoading, setIsStopLoading] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [curPage, setCurPage] = useState(1);
  const [isLastpage, setIsLast] = useState(false);
  const [pageTokenArr, setPageTokenArr] = useState<any>([null]);
  const [taskListData, setTaskListData] = useState<any>([]);
  const [curSelectTask, setCurSelectTask] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  async function getTaskList(token: string | null, direction: string) {
    setIsLoading(true);
    const authType = localStorage.getItem(AUTH_TYPE_NAME);
    const openIdHeader = {
      Authorization: `${localStorage.getItem(DRH_API_HEADER) || ""}`,
    };
    const apiData: any = await API.graphql(
      {
        query: listTasks,
        variables: {
          limit: 15,
          nextToken: token,
        },
      },
      authType === OPEN_ID_TYPE ? openIdHeader : undefined
    );
    // Build Pagination Data
    // First build Table Data
    // const dataListArr: any = [];
    // If click the next, set New Next token
    if (direction === "next") {
      if (apiData.data.listTasks.nextToken) {
        setNextToken(apiData.data.listTasks.nextToken);
      } else {
        setIsLast(true);
      }
    }
    if (
      apiData &&
      apiData.data &&
      apiData.data.listTasks &&
      apiData.data.listTasks.items
    ) {
      const orderedList = apiData.data.listTasks.items;
      orderedList.sort((a: any, b: any) =>
        a.createdAt < b.createdAt ? 1 : -1
      );
      setTaskListData(orderedList);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    getTaskList(null, "next");
  }, []);

  // Hide Create Flag in 3 seconds
  useEffect(() => {
    window.setTimeout(() => {
      dispatch({
        type: "hide create task flag",
      });
    }, 4000);
  }, [dispatch]);

  const goToStepOne = () => {
    dispatch({ type: "close side bar" });
    const toPath = "/create/step1/S3";
    history.push({
      pathname: toPath,
    });
  };

  const goToDetail = () => {
    const toPath = `/task/detail/${curSelectTask.type}/${curSelectTask.id}`;
    history.push({
      pathname: toPath,
    });
  };

  async function stopTaskFunc(taskId: string) {
    const authType = localStorage.getItem(AUTH_TYPE_NAME);
    const openIdHeader = {
      Authorization: `${localStorage.getItem(DRH_API_HEADER) || ""}`,
    };
    try {
      const stopResData: any = await API.graphql(
        {
          query: stopTask,
          variables: {
            id: taskId,
          },
        },
        authType === OPEN_ID_TYPE ? openIdHeader : undefined
      );
      setIsStopLoading(false);
      setOpen(false);
      refreshData();
      console.info("stopResData:", stopResData);
    } catch (error) {
      console.error("error:", error?.errors[0]?.message?.toString() || "Error");
      const errorMsg = error?.errors[0]?.message?.toString() || "Error";
      setIsStopLoading(false);
      setMessageOpen(true);
      setErrorMessage(errorMsg);
      showErrorMessage();
    }
  }

  const stopCurTask = () => {
    setAnchorEl(null);
    setOpen(true);
  };

  const cloneCurTask = () => {
    setAnchorEl(null);
    console.info("curSelectTask:", curSelectTask);
    const tmpTaskInfo = curSelectTask;
    tmpTaskInfo.parametersObj = {};
    // when need to clone task type is S3
    if (curSelectTask.type === EnumTaskType.S3) {
      if (curSelectTask.parameters && curSelectTask.parameters.length > 0) {
        curSelectTask.parameters.forEach((element: any) => {
          if (element.ParameterKey === "jobType") {
            if (element.ParameterValue === "PUT") {
              tmpTaskInfo.parametersObj.bucketInAccount = EnumBucketType.Source;
            } else {
              tmpTaskInfo.parametersObj.bucketInAccount =
                EnumBucketType.Destination;
            }
          }
          tmpTaskInfo.parametersObj[element.ParameterKey] =
            element.ParameterValue;
        });
      }
    }
    if (curSelectTask.type === EnumTaskType.ECR) {
      if (curSelectTask.parameters && curSelectTask.parameters.length > 0) {
        curSelectTask.parameters.forEach((element: any) => {
          if (element.ParameterKey === "srcAccountId") {
            if (element.ParameterValue === "") {
              tmpTaskInfo.parametersObj.sourceInAccount = YES_NO.YES;
            } else {
              tmpTaskInfo.parametersObj.sourceInAccount = YES_NO.NO;
            }
          }
          if (element.ParameterKey === "destAccountId") {
            if (element.ParameterValue === "") {
              tmpTaskInfo.parametersObj.destInAccount = YES_NO.YES;
            } else {
              tmpTaskInfo.parametersObj.destInAccount = YES_NO.NO;
            }
          }
          if (element.ParameterKey === "srcRegion") {
            const srcRegionName = AWS_REGION_LIST.find(
              (ele) => ele.value === element.ParameterValue
            )?.name;
            if (srcRegionName) {
              tmpTaskInfo.parametersObj.srcRegionDefault = {
                name: srcRegionName,
                value: element.ParameterValue,
              };
            }
          }
          if (element.ParameterKey === "destRegion") {
            const destRegionName = AWS_REGION_LIST.find(
              (ele) => ele.value === element.ParameterValue
            )?.name;
            if (destRegionName) {
              tmpTaskInfo.parametersObj.destRegionDefault = {
                name: destRegionName,
                value: element.ParameterValue,
              };
            }
          }
          tmpTaskInfo.parametersObj[element.ParameterKey] =
            element.ParameterValue;
        });
      }
    }
    dispatch({
      type: "update task info",
      taskInfo: tmpTaskInfo,
    });
    // Redirect to Create S3 Task Step two
    const toPath = "/create/step2/" + curSelectTask.type;
    history.push({
      pathname: toPath,
    });
  };

  type StatusType = {
    name: string;
    src: string;
    class: string;
  };

  interface StatusDataType {
    [key: string]: StatusType;
  }

  const changeRadioSelect = (event: any) => {
    console.info("event:", event);
  };

  const clickTaskInfo = (taskInfo: any, event: any) => {
    setCurSelectTask(taskInfo);
  };

  const refreshData = () => {
    setCurPage(1);
    setIsLast(false);
    setCurSelectTask(null);
    getTaskList(null, "next");
  };

  const toPrevPage = () => {
    setIsLast(false);
    setCurSelectTask(null);
    const newCurPage = curPage - 1;
    setCurPage(newCurPage < 1 ? 1 : newCurPage);
    getTaskList(pageTokenArr[newCurPage - 1], "prev");
  };

  const toNextPage = () => {
    setCurSelectTask(null);
    const newCurPage = curPage + 1;
    if (pageTokenArr.indexOf(nextToken) === -1) {
      pageTokenArr.push(nextToken);
    }
    setPageTokenArr(pageTokenArr);
    if (pageTokenArr[newCurPage - 1]) {
      getTaskList(pageTokenArr[newCurPage - 1], "next");
    } else {
      getTaskList(nextToken, "next");
    }
    setCurPage(newCurPage);
  };

  const [tipsOpen, setTipsOpen] = useState(false);
  const showErrorMessage = () => {
    setTipsOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const confirmStopTask = () => {
    stopTaskFunc(curSelectTask.id);
  };

  const handleCloseMessage = () => {
    setMessageOpen(false);
  };

  const getParamsValueByName = (name: string, paramList: any) => {
    return (
      paramList.find((item: any) => item.ParameterKey === name)
        ?.ParameterValue || ""
    );
  };

  const buildTaskSource = (item: any) => {
    if (item.type === EnumTaskType.S3) {
      return (
        getParamsValueByName("sourceType", item.parameters) +
        "/" +
        getParamsValueByName("srcBucketName", item.parameters)
      );
    }
    if (item.type === EnumTaskType.ECR) {
      if (
        getParamsValueByName("sourceType", item.parameters) ===
        ECREnumSourceType.PUBLIC
      ) {
        return getParamsValueByName("sourceType", item.parameters);
      }
      if (
        getParamsValueByName("sourceType", item.parameters) ===
        ECREnumSourceType.ECR
      ) {
        return getParamsValueByName("srcRegion", item.parameters);
      }
    }
    return "";
  };

  const buildTaskDestination = (item: any) => {
    if (item.type === EnumTaskType.S3) {
      return getParamsValueByName("destBucketName", item.parameters);
    }
    if (item.type === EnumTaskType.ECR) {
      return getParamsValueByName("destRegion", item.parameters);
    }
    return "";
  };

  return (
    <div className="drh-page">
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {t("taskList.stopTask")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("taskList.tips.confimStop")}{" "}
            <b>{curSelectTask && curSelectTask.id}</b>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <div className="padding-15">
            <NormalButton onClick={handleClose} color="primary">
              {t("btn.cancel")}
            </NormalButton>
            {isStopLoading ? (
              <StopButtonLoading disabled={true}>
                <Loader type="ThreeDots" color="#ffffff" height={10} />
              </StopButtonLoading>
            ) : (
              <PrimaryButton
                onClick={confirmStopTask}
                color="primary"
                autoFocus
              >
                {t("btn.confirm")}
              </PrimaryButton>
            )}
          </div>
        </DialogActions>
      </Dialog>
      {tipsOpen && (
        <Snackbar
          anchorOrigin={{ horizontal: "center", vertical: "top" }}
          open={messageOpen}
          onClose={handleCloseMessage}
          autoHideDuration={1500}
        >
          <Alert severity="error">{errorMessage}</Alert>
        </Snackbar>
      )}
      <LeftMenu />
      <div className="right">
        <InfoBar />
        {createTaskFlag && (
          <div className="task-status">
            <div className="content">
              <STATUS_OK className="icon" />
              {t("taskList.tips.successMsg")}
            </div>
          </div>
        )}

        <div className="padding-right-40">
          <div className="page-breadcrumb">
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" />}
              aria-label="breadcrumb"
            >
              <MLink color="inherit" href="/#/">
                {t("breadCrumb.home")}
              </MLink>
              <Typography color="textPrimary">
                {t("breadCrumb.tasks")}
              </Typography>
            </Breadcrumbs>
          </div>
          <div className="table-data">
            <div className="box-shadow">
              <div className="title">
                <div className="options">
                  <div className="task-count">
                    {t("taskList.title")}
                    {/* <span className="info">(10)</span> */}
                  </div>
                  <div className="buttons">
                    <NormalButton onClick={refreshData}>
                      <RefreshIcon width="10" />
                    </NormalButton>
                    <NormalButton
                      disabled={curSelectTask === null}
                      onClick={goToDetail}
                    >
                      {t("btn.viewDetail")}
                    </NormalButton>
                    <div style={{ display: "inline-block" }}>
                      <NormalButton
                        disabled={curSelectTask === null}
                        aria-controls="customized-menu"
                        onClick={handleClick}
                      >
                        {t("btn.taskAction")}
                        <span style={{ marginLeft: 3 }}>▼</span>
                      </NormalButton>
                      <StyledMenu
                        id="customized-menu"
                        anchorEl={anchorEl}
                        keepMounted
                        open={Boolean(anchorEl)}
                        onClose={handleCloseMenu}
                      >
                        {!(
                          curSelectTask === null ||
                          curSelectTask.progress === EnumTaskStatus.STOPPING ||
                          curSelectTask.progress === EnumTaskStatus.STOPPED
                        ) && (
                          <StyledMenuItem>
                            <ListItemText
                              onClick={stopCurTask}
                              primary={t("btn.stopTask")}
                            />
                          </StyledMenuItem>
                        )}
                        <StyledMenuItem>
                          <ListItemText
                            onClick={cloneCurTask}
                            primary={t("btn.cloneTask")}
                          />
                        </StyledMenuItem>
                      </StyledMenu>
                    </div>

                    <PrimaryButton onClick={goToStepOne}>
                      {t("btn.createTask")}
                    </PrimaryButton>
                  </div>
                </div>
                <div className="search">
                  <div className="search-input">
                    {/* <input type="text" placeholder="Find resources" /> */}
                  </div>
                  <div className="pagination">
                    <div>
                      {curPage > 1 && !isLoading ? (
                        <span onClick={toPrevPage} className="item prev">
                          <PAGE_PREV />
                        </span>
                      ) : (
                        <span className="item prev disabled">
                          <PAGE_PREV_DISABLED color="disabled" />
                        </span>
                      )}
                      <span className="cur-page">{curPage}</span>
                      {isLastpage || isLoading ? (
                        <span className="item next disabled">
                          <PAGE_NEXT_DISABLED color="disabled" />
                        </span>
                      ) : (
                        <span onClick={toNextPage} className="item next">
                          <PAGE_NEXT />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="setting-icon">
                    {/* <img alt="settings" width="20" src={SETTING_ICON} /> */}
                  </div>
                </div>
              </div>
              <div className="data-list">
                {isLoading ? (
                  <Loading />
                ) : (
                  <div className="table-wrap">
                    <div className="table-header">
                      <div className="table-item check-item">&nbsp;</div>
                      <div className="table-item item-id">
                        {t("taskList.table.taskId")}
                      </div>
                      <div className="table-item header-item">
                        {t("taskList.table.source")}
                      </div>
                      <div className="table-item header-item">
                        {t("taskList.table.destination")}
                      </div>
                      <div className="table-item header-item">
                        {t("taskList.table.engineType")}
                      </div>
                      <div className="table-item header-item">
                        {t("taskList.table.status")}
                      </div>
                      <div className="table-item create-time">
                        {t("taskList.table.createdTime")}
                      </div>
                    </div>
                    {taskListData.map((element: any, index: any) => {
                      const rowClass = classNames({
                        "table-row": true,
                        active:
                          curSelectTask && curSelectTask.id === element.id,
                      });
                      return (
                        <div
                          onClick={(event) => {
                            clickTaskInfo(element, event);
                          }}
                          data-uuid={element.id}
                          key={index}
                          className={rowClass}
                        >
                          <div className="table-item check-item center">
                            <input
                              onChange={(event) => {
                                changeRadioSelect(event);
                              }}
                              checked={
                                curSelectTask
                                  ? curSelectTask.id === element.id
                                  : false
                              }
                              type="radio"
                              name="taskList"
                            />
                          </div>
                          <div className="table-item item-id">
                            <Link
                              to={`/task/detail/${element.type}/${element.id}`}
                            >
                              {element.id}
                            </Link>
                          </div>
                          <div
                            className="table-item body-item"
                            title={buildTaskSource(element)}
                          >
                            {buildTaskSource(element)}
                          </div>
                          <div
                            className="table-item body-item"
                            title={buildTaskDestination(element)}
                          >
                            {buildTaskDestination(element)}
                          </div>
                          <div className="table-item body-item">
                            {element.type}
                          </div>
                          <div className="table-item body-item">
                            <div
                              className={
                                element.progress
                                  ? TASK_STATUS_MAP[element.progress].class +
                                    " status"
                                  : "status"
                              }
                            >
                              <span className="icon">
                                {element.progress
                                  ? STATUS_ICON_MAP[element.progress]
                                  : ""}
                              </span>
                              {element.progress
                                ? TASK_STATUS_MAP[element.progress].name
                                : ""}
                            </div>
                          </div>
                          <div className="table-item create-time">
                            <Moment format="YYYY-MM-DD HH:mm">
                              {element.createdAt}
                            </Moment>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="bottom">
          <Bottom />
        </div>
      </div>
    </div>
  );
};

export default List;
